# Module 1 — Core Concepts

Read this module top to bottom once — each concept depends on the previous one.

## 1. Broker & cluster

A **broker** is one Kafka server process: it stores data (as log segments on disk) and serves produce/fetch requests. A **cluster** is a set of brokers working together. You talk to "the cluster" via any broker (`bootstrap-servers`); that broker tells the client the full cluster metadata (who leads what partition) so the client can then talk directly to the right broker for each partition.

**Gotcha:** `bootstrap-servers` is a *discovery* list, not the full membership — you don't need to list every broker, just enough that at least one is reachable at startup. But for resilience you should list more than one, so a client can still start up if the first one in the list happens to be down.

## 2. Topic

A named, typed stream of events — conceptually like a table name, or a "channel." Producers write to a topic; consumers read from a topic. Topics are the unit of access control and retention configuration.

**Gotcha:** topics can be auto-created on first produce if `auto.create.topics.enable=true` on the broker (often true in dev images, **false** in most managed/prod clusters). Relying on auto-creation means you get default partition count/replication factor, not what you intended — always explicitly declare topics (see Module 3, `NewTopic`/`KafkaAdmin`) in real projects.

## 3. Partition

A topic is split into one or more **partitions**, each an ordered, append-only, immutable log. Partitions are Kafka's unit of parallelism *and* the boundary of its ordering guarantee.

- Ordering is guaranteed **within a partition only** — never across partitions of the same topic.
- More partitions = more parallelism (more consumers can work concurrently) but also more open file handles/replication traffic on the brokers, and more complexity in maintaining order for anything that spans partitions.

**Gotcha:** you can increase a topic's partition count later, but you **cannot decrease it**, and adding partitions **reshuffles which keys land where** (the hash-to-partition mapping changes), which breaks per-key ordering for existing keys the moment you do it. Decide partition count with your expected max consumer parallelism and key cardinality in mind up front; over-provision modestly rather than under-provision, but don't go extreme (each partition has real overhead on the broker).

## 4. Offset

Each message within a partition gets a monotonically increasing **offset** (0, 1, 2, ...). Crucially: **the broker does not track "which messages has this consumer processed."** The consumer (or Spring Kafka on its behalf) tracks and commits its own offset per partition, stored in an internal Kafka topic (`__consumer_offsets`). This is the mechanism that makes replay possible — resetting a consumer group's offset back to an earlier point causes it to re-read history.

**Gotcha:** offsets are **per consumer group**, not global. Two different consumer groups reading the same topic each have their own independent offset — this is exactly how Kafka gives you pub/sub fan-out on top of a log (see consumer groups below).

## 5. Producer

Writes records to a topic. A record is `(key, value, [partition], [timestamp], [headers])`. If you don't specify a partition explicitly, Kafka's partitioner decides:
- **With a key:** hash(key) % numPartitions (deterministic — same key always → same partition, this is what gives you per-key ordering)
- **Without a key:** sticky/round-robin batching across partitions (varies by client version; modern clients batch to one partition at a time for efficiency, then rotate, rather than pure round-robin per-message)

**Gotcha:** if you rely on hash(key) % numPartitions for ordering and then increase partition count, the modulus changes, and the same key can now land on a different partition than before — new events for that key can now be processed out of order relative to older ones sitting in the "old" partition. Plan partition count before you have ordering-sensitive production traffic.

## 6. Message key & partitioning strategy

The key is how you get ordering guarantees for a logical entity — e.g. all events for one `sessionId`, one `orderId`, one `userId` should share a key so they land in the same partition and are processed by the same consumer in send order.

**Comparison — choosing a key:**

| Strategy | Ordering guarantee | Load distribution | When to use |
|---|---|---|---|
| No key (null) | None across partitions | Even (round-robin/sticky) | Pure throughput, order truly doesn't matter (e.g. independent metric pings) |
| Entity id as key (userId, orderId, sessionId) | Ordered per entity | Even *if* entity ids are high-cardinality and evenly distributed | Most common choice — event streams about "things" that have their own lifecycle |
| Coarse key (e.g. tenantId, region) | Ordered per group | Can be very uneven if group sizes differ ("hot partition") | Only when cross-entity ordering within the group actually matters |

**Gotcha — hot partitions:** if your key has low cardinality or a skewed distribution (e.g. keying by `country` where 80% of traffic is one country), that one partition (and the one consumer instance reading it) becomes a bottleneck no matter how many partitions/consumers you add. Prefer high-cardinality keys unless you specifically need coarser ordering.

## 7. Consumer & consumer group

A **consumer group** is a named set of consumer instances that split the work of consuming a topic: Kafka guarantees each partition is owned by **at most one consumer within a group at a time**. This gives you:
- **Parallelism** — N partitions can be processed by up to N consumers in the same group simultaneously.
- **Independent fan-out across groups** — two different consumer groups reading the same topic each get a full independent copy of every message (this is how you get pub/sub semantics *and* competing-consumer load balancing out of the same primitive, just by choosing the same or different `group.id`).

**Comparison — same group vs different groups:**

| | Same consumer group | Different consumer groups |
|---|---|---|
| Each message delivered to | Exactly one consumer instance in the group | Every group independently |
| Use case | Scale out processing of one workload | Multiple independent services each need their own full view (e.g. billing service and analytics service both read `OrderPlaced`) |

**Gotcha:** if you have more consumer instances in a group than partitions, the extras sit **idle** — partitions can't be split further. Consumer parallelism is capped by partition count, full stop. This is also why `spring.kafka.listener.concurrency` (Module 3) should not exceed your topic's partition count.

## 8. Rebalancing

When a consumer joins or leaves a group (crash, deploy, scale event), the group's partitions are **reassigned** among the remaining/new members. This is called a rebalance.

- **Eager rebalancing** (older default): **all** consumers in the group stop processing, give up all partitions, then get reassigned — a "stop the world" pause across the whole group, even for partitions that didn't need to move.
- **Cooperative sticky rebalancing** (`CooperativeStickyAssignor`, newer, recommended): only the partitions that actually need to move are revoked; unaffected consumers keep processing uninterrupted. Much smaller blast radius.

**Gotcha:** rebalances are a common source of production hiccups — a rolling deploy of N consumer instances can trigger N rebalances, each briefly pausing the whole group under the eager strategy. If you deploy consumers frequently, prefer the cooperative sticky assignor. Also: a consumer that takes too long between `poll()` calls (see `max.poll.interval.ms` in Module 3) is presumed dead and gets kicked out, *triggering* an unwanted rebalance — this is the #1 cause of "phantom" rebalances in production, usually from slow message processing, not actual crashes.

## 9. Replication

Each partition has a configurable number of **replicas** (copies) across different brokers, for fault tolerance:
- **Leader** — the replica that handles all reads/writes for that partition.
- **Followers** — replicate the leader's log; one is promoted to leader if the current leader's broker dies.
- **ISR (in-sync replicas)** — the subset of replicas that are fully caught up with the leader; only ISR members are eligible to become the new leader without data loss.
- **`replication factor`** — how many total copies of each partition exist (leader + followers). **`min.insync.replicas`** — how many replicas (including leader) must acknowledge a write before it's considered committed, when the producer uses `acks=all`. These two work together: `replication.factor=3` + `min.insync.replicas=2` tolerates one broker being down while still requiring durability confirmation from 2 nodes.

**Gotcha, tying back to your repo:** `KafkaTopicConfig` sets `.replicas(1)` — meaning **zero fault tolerance**: if that one broker (or disk) is lost, the partition's data is gone. This is fine for a single-broker local dev setup (you *can't* set replicas > number of brokers — the topic creation will fail), but must be raised (typically 3) with a real multi-broker cluster before this is production-safe.

## 10. Retention & compaction

Two different policies for how long/what Kafka keeps in a partition's log:

| | Time/size-based retention | Log compaction |
|---|---|---|
| What's kept | Everything, until it ages out (`retention.ms`) or the log exceeds `retention.bytes` | Only the **latest value per key**, older values for the same key are eventually removed |
| Use case | Event streams (things that happened) — e.g. clickstream, order-placed events | "Current state" topics — e.g. "latest profile for user X," change-data-capture tables |
| Deletes on read? | No — retention is time/size-based, independent of consumption | No — compaction runs in the background independent of consumption too |

**Gotcha:** compaction requires every record to have a key (records without a key can't be deduped by key) and does **not** guarantee old values are removed immediately — it's a background process, so a consumer reading right after a write may still see stale duplicate keys for a while. Compaction is about eventual space reclamation and "latest state," not an instant dedupe guarantee.

## 11. Delivery semantics

The big one, and the thing your `EventConsumer` review flagged as an undecided gap.

| Semantic | What it means | How you get it |
|---|---|---|
| At-most-once | Message may be lost, never duplicated | Commit offset **before** processing (or `acks=0`) |
| At-least-once | Message never lost, but may be delivered/processed more than once | Commit offset **after** successful processing; producer retries + `acks=all` |
| Exactly-once | Message processed effectively once, no loss, no duplicate side effects | Idempotent producer + transactions (producer→broker "exactly once" for the write itself) **plus** an idempotent consumer or a Kafka Streams/transactional consume-transform-produce pipeline |

**Gotcha:** "exactly-once" in Kafka's own transaction feature covers **Kafka-to-Kafka** exactly-once (e.g. Kafka Streams reading a topic and writing to another topic transactionally). It does **not** automatically give you exactly-once for an external side effect like a Mongo write — that always requires *your* consumer logic to be idempotent (dedupe by an id, or make the operation naturally idempotent like an upsert), because you can't wrap "commit Kafka offset" and "commit a Mongo document" in one atomic transaction unless you use patterns like transactional outbox (Module 4). This is precisely the gap in `EventConsumer.consume()` — auto-commit + a non-idempotent `$inc` on `eventCount` means a redelivered message double-counts.

## 12. ZooKeeper vs KRaft

Older Kafka versions used **ZooKeeper** as an external coordination service to store cluster metadata (broker list, partition leader info, ACLs) and run controller elections. Modern Kafka (post-KIP-500, default since Kafka 3.x/4.x) uses **KRaft** — Kafka's own Raft-based consensus built into the brokers themselves, removing the ZooKeeper dependency entirely.

**Gotcha:** you'll still see plenty of tutorials/docker-compose files with a `zookeeper` service — that's the old mode. New setups (and anything you spin up fresh in 2026) should use KRaft; it's simpler to operate (one less system to run) and is where all new Kafka development is focused.

## Interview questions for this module

1. **"What determines message order in Kafka?"** — Partition, not topic; only guaranteed within a single partition; same key → same partition → order preserved for that key.
2. **"What happens if you have more consumers than partitions?"** — Extra consumers sit idle; parallelism is capped at partition count.
3. **"Explain consumer groups and how they give you both load-balancing and pub/sub."** — Same group = split work; different groups = independent full copies.
4. **"What's a rebalance and why can it hurt production traffic?"** — Partition reassignment on membership change; eager causes group-wide pause; cooperative-sticky minimizes it; slow processing (`max.poll.interval.ms` exceeded) is a common accidental trigger.
5. **"What does `replicas=1` actually mean and why is it risky?"** — No fault tolerance; losing that broker loses the partition's data.
6. **"Difference between retention and compaction?"** — Time/size-based deletion of an event stream vs keep-latest-per-key for state topics.
7. **"Is Kafka exactly-once really exactly once end-to-end?"** — No, not for external side effects; needs idempotent consumers or outbox pattern for anything outside Kafka itself. This question specifically separates people who've only read the marketing from people who've operated it.
8. **"Why must offset commit timing be considered carefully?"** — Committing before processing risks message loss on crash; committing after processing (default in Spring Kafka's typical setup) risks duplicate processing on crash/retry — hence the need for idempotent consumer logic either way.
