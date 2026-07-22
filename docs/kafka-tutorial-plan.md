# Kafka Tutorial Plan — From Zero to Production-Ready

Audience: someone new to message brokers/queuing entirely (no prior RabbitMQ/SQS experience assumed).
Format: each module below is a section of the eventual tutorial. This file is the *plan* — outline, objectives, and what must be covered — not the final prose. Build the actual write-up module by module from this.

---

## Module 0 — Why a message broker at all

**Objective:** before touching Kafka, understand the problem class it solves.

- Synchronous (request/response) vs asynchronous (fire-and-forget / event-driven) communication
- What breaks in a pure synchronous system: tight coupling, cascading failures, no buffering under load spikes
- Point-to-point queues (classic MQ / SQS) vs publish-subscribe vs Kafka's log-based model — draw the distinction early, it's the thing beginners conflate
- Where a broker sits in a real architecture: producer service → broker → one or many independent consumer services
- Concrete "why": decoupling producers from consumers, absorbing traffic spikes, replaying history, fanning one event out to multiple independent subscribers, ordering guarantees per key

**When to reach for Kafka vs when not to:**
- Good fit: high-throughput event streams, multiple independent consumers of the same event, need to replay/reprocess history, ordering-per-key matters
- Poor fit / overkill: simple task queues with no replay need (a plain queue like SQS/RabbitMQ is simpler), low volume, need strict global FIFO across all messages, need synchronous request/reply
- Kafka vs RabbitMQ/SQS one-paragraph comparison: Kafka is a durable, replayable log consumers read at their own pace; classic queues delete a message once acked and don't naturally support replay or multiple independent full-history subscribers

---

## Module 1 — Core concepts (the mental model)

Teach in this order, each concept building on the last:

1. **Broker & cluster** — a Kafka server; a cluster is multiple brokers for scale/fault-tolerance
2. **Topic** — a named stream of events (like a table name, not a queue)
3. **Partition** — a topic is split into ordered, immutable logs (partitions) for parallelism; order is guaranteed *within* a partition only, never across partitions
4. **Offset** — each message's position within its partition; consumers track *their own* offset, broker doesn't push state onto them
5. **Message key & partitioning** — same key always hashes to the same partition ⇒ per-key ordering (this is why the analytics-engine code keys on `sessionId`: all events for one session land in one partition, in order)
6. **Producer** — writes to a topic, chooses (or lets Kafka choose) the partition
7. **Consumer & consumer group** — within a group, each partition is consumed by exactly one member; this is how Kafka gets you both parallelism *and* "only one instance processes this message" — contrast with pub/sub fan-out (two different consumer groups both get every message independently)
8. **Rebalancing** — what happens when a consumer joins/leaves a group (partition reassignment); mention `eager` vs `cooperative-sticky` rebalancing briefly, this is a common production gotcha (stop-the-world pause during rebalance)
9. **Replication** — replicas per partition, leader/follower, ISR (in-sync replicas); tie back to their own `replicas(1)` in `KafkaTopicConfig` — explain that's zero fault tolerance and why
10. **Retention & compaction** — time/size-based retention vs log compaction (keep only latest value per key) — explain the two use cases (event stream vs "current state" topic)
11. **Delivery semantics** — at-most-once / at-least-once / exactly-once, and which knobs control which (producer acks + idempotence, consumer commit timing) — this is the concept most directly missing from their current code, flag it as a preview of Module 4
12. **ZooKeeper vs KRaft** — brief, just enough that they're not confused when they see either in a docker-compose file; note modern Kafka defaults to KRaft (no ZooKeeper)

**Checkpoint exercise for this module:** given a scenario (e.g. "3 partitions, 2 consumers in the same group"), have the reader draw which consumer owns which partition, and predict what happens when a 3rd consumer joins.

---

## Module 2 — The APIs

Cover each API's purpose (not full method-by-method reference — link official docs for that):

- **Producer API** — `send()`, sync vs async send, the returned `Future`/callback, what "fire and forget" actually risks (this is issue #3 from the code review — discarded futures)
- **Consumer API** — the poll loop model (`poll()` is not push — the client library pulls), manual vs auto offset commit, `subscribe()` vs `assign()`
- **Admin API** — creating/listing/deleting topics programmatically (`NewTopic`, `AdminClient`) — ties to their existing `KafkaTopicConfig`
- **Streams API** — one-paragraph mention: stream processing (joins, aggregations) built on top of the consumer/producer APIs; out of scope for this tutorial but good to know it exists
- **Kafka Connect** — one-paragraph mention: source/sink connectors for moving data in/out of Kafka without hand-written producer/consumer code (e.g. DB → Kafka via Debezium); relevant context, not needed for their use case

**Checkpoint exercise:** read the raw (non-Spring) `kafka-clients` producer/consumer example so they see what Spring Kafka is abstracting over, before jumping into Spring.

---

## Module 3 — Spring Boot + Spring Kafka: full configuration walkthrough

Go **config value by config value** — this is explicitly requested, so don't skim it. Structure as a table: property → what it controls → what happens at each extreme → recommended default.

**Connection**
- `spring.kafka.bootstrap-servers` — how the client finds the cluster (only needs one broker to discover the rest)

**Producer**
- `key-serializer` / `value-serializer` — how objects become bytes on the wire
- `acks` (`0`/`1`/`all`) — durability vs latency tradeoff; explain exactly what each value guarantees
- `retries` + `retry.backoff.ms` — transient failure handling
- `enable.idempotence` — prevents duplicate writes from producer-side retries; explain why this must be paired with `acks=all`
- `delivery.timeout.ms` — the outer bound tying retries+backoff+request timeout together
- `linger.ms` / `batch.size` — client-side batching for throughput (already set in their `application.properties` — use as the worked example)
- `compression.type` — snappy/gzip/lz4/zstd tradeoffs
- `max.in.flight.requests.per.connection` — the setting that determines whether idempotence still gives you ordering guarantees under retries

**Consumer**
- `group-id` — which consumer group this instance belongs to
- `auto-offset-reset` (`earliest`/`latest`) — what happens with no committed offset yet
- `enable-auto-commit` + `auto.commit.interval.ms` vs manual ack — the single biggest correctness lever (this is exactly their current gap: offset auto-commits regardless of whether Mongo write succeeded)
- `max.poll.records` / `max.poll.interval.ms` — batch size per poll and the rebalance-triggering timeout if processing takes too long
- `session.timeout.ms` / `heartbeat.interval.ms` — liveness detection
- `fetch.min.bytes` / `fetch.max.wait.ms` — server-side batching for the consumer fetch
- `isolation.level` — `read_committed` vs `read_uncommitted`, relevant once transactions are involved
- `spring.json.trusted.packages` — deserialization allowlisting (flag their current `*` as the anti-pattern example)

**Listener container**
- `spring.kafka.listener.concurrency` — number of consumer threads per instance (capped by partition count — explain why concurrency > partitions wastes threads)
- `ackMode` (`RECORD`/`BATCH`/`MANUAL`/`MANUAL_IMMEDIATE`) — how `@KafkaListener` ties commit timing to processing outcome

**Topic provisioning**
- `NewTopic` beans / `KafkaAdmin` — partitions & `replicas` — explain replication factor vs cluster size (their `replicas(1)` only works because they likely run a single-broker dev cluster; would fail against a 1-broker prod cluster too, needs ≥3 brokers for `replicas(3)`)

**Use their actual files as the running example throughout this module** (`KafkaTopicConfig.java`, `application.properties`, `EventController.java`, `EventConsumer.java`) — annotate what's there, what's implicitly defaulted, and what's missing, rather than inventing a parallel example.

---

## Module 4 — Industry-standard patterns

- **Error handling / dead-letter topics** — `DefaultErrorHandler` + `DeadLetterPublishingRecoverer`, backoff policies (`FixedBackOff`/`ExponentialBackOffWithMaxRetries`), and how to reprocess a DLT later
- **Idempotent consumers** — since at-least-once delivery means redelivery happens, consumer logic must tolerate processing the same message twice (dedupe by a message/event id, or make the write itself idempotent — e.g. upsert instead of increment)
- **Transactional outbox pattern** — the general fix for "DB write + Kafka publish must both happen or neither" when you can't use Kafka transactions across an unrelated DB
- **Kafka transactions / exactly-once processing** — briefly, for consume-transform-produce pipelines (less relevant to their consume-and-persist-to-Mongo case, but good to know it exists and why it doesn't solve the Mongo+Kafka atomicity problem by itself)
- **Consumer lag monitoring** — what lag means, why it's the #1 Kafka health metric, tools (Burrow, Kafka UI, Prometheus JMX exporter)
- **Testing** — `EmbeddedKafka` / Testcontainers for integration tests (they already have `spring-boot-starter-kafka-test` as a dependency with zero tests using it)
- **Schema evolution** — brief mention of Avro/Protobuf + Schema Registry as the production alternative to raw JSON, and why (compatibility guarantees across producer/consumer versions)
- **Security basics** — SASL/SSL, ACLs — one paragraph, not a deep dive

Frame each pattern against a gap already found in the code review of their `EventConsumer`/`EventController`, so the pattern lands as "here's the fix for the exact problem you have," not abstract theory.

---

## Module 5 — Worked example (teaching code)

Use a small, self-contained example separate from their production code, so mistakes are cheap:

**Scenario:** an "order placed" event — producer service publishes `OrderPlacedEvent{orderId, customerId, amount}` keyed by `customerId`; consumer service listens and logs/stores it.

Cover, in order:
1. Raw `kafka-clients` producer + consumer (no Spring) — 20 lines each, just to demystify what Spring is wrapping
2. Same thing in Spring Boot: `KafkaTemplate.send()`, `@KafkaListener`, DTO + Jackson serialization
3. Add a `NewTopic` bean, run it, show messages flowing via a CLI consumer (`kafka-console-consumer`) alongside the Spring app, so they see the topic is broker state independent of any one app
4. Layer in one deliberate failure (bad JSON) and show the default retry-then-drop behavior live, then fix it with a DLT — this makes Module 4's DLT pattern concrete instead of theoretical

---

## Module 6 — Hands-on integration task

Give the reader a small, scoped task to do themselves (not the worked example — new code):

**Task:** build a two-service mini system — a "notification" producer/consumer pair — where:
- A REST endpoint accepts `{ userId, message, channel }` and publishes it to a `notifications` topic keyed by `userId`
- A consumer in a `notification-consumer-group` reads it and "sends" it (just log it, or write to an in-memory map/H2 table) — pretend-send with a 10% simulated random failure
- Requirements they must satisfy themselves (this is where the learning happens):
  1. Configure the topic with 3 partitions, correct key so one user's notifications stay ordered
  2. Set `acks=all` + idempotent producer, justify the choice in a comment
  3. Handle the simulated failures with a retry + DLT, and write a tiny consumer that drains the DLT and prints what landed there
  4. Make the consumer logic idempotent (dedupe by a generated message id) so redelivery doesn't double-send
  5. Write one `EmbeddedKafka` integration test proving a message published via the REST endpoint is eventually consumed

**Stretch goal (optional, ties back to their real codebase):** apply fixes 1–4 above to the actual `EventController`/`EventConsumer` in analytics-backend — add a DLT, stop discarding the producer `Future`, and make the session-increment idempotent or wrap it with the Event write in a Mongo transaction.

---

## Suggested ordering / pacing

Modules 0–2 (concepts + APIs) can be read in one sitting. Module 3 (config) is reference material — read once fully, then revisit as a lookup table while coding. Modules 4–6 (patterns, worked example, task) are hands-on and should be done in front of a keyboard, not just read.
