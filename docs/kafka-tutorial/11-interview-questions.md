# Consolidated Kafka Interview Cheat Sheet

Quick-recall pass over everything in Modules 0-9. Each module file has these embedded in context with more explanation — use this file the night before an interview, use the module files to actually learn the material. Module 10 (system design questions) is scenario-based and doesn't reduce to one-line answers — review it separately.

## Fundamentals & event streaming (Module 0)

- **What is Kafka, why use it over a REST call?** Durable, replayable, partitioned log; decouples producer from consumer, absorbs backpressure, supports independent multi-consumer fan-out and replay.
- **Kafka vs RabbitMQ?** Log-based/replayable/consumer-tracks-own-offset vs smart-broker/routing-rich/message-deleted-on-ack.
- **When would you NOT use Kafka?** Low volume, no replay need, need strict global (not per-key) ordering, need synchronous request/reply, or operational simplicity matters more than throughput/replay.
- **Does Kafka delete a message once consumed?** No — retention/compaction policy governs deletion, independent of how many consumers have read it.
- **Event notification vs event-carried state transfer vs event sourcing?** How much information rides in the event: "just an id" vs "full state" vs "the event is the only source of truth, state derived by replay."
- **What's CQRS?** Separate write and read models; Kafka commonly keeps a read-optimized model in sync with the write model's events.
- **What's Change Data Capture and why use it?** Tails a DB's transaction log (Debezium-style) to turn existing writes into a stream with zero application code changes; also the usual engine behind the outbox pattern.

## Local setup (Module 1)

- **Your Spring app connects to Kafka in Docker but every produce/consume hangs — first thing to check?** `advertised.listeners` — the bootstrap connects fine, but the broker tells the client to reconnect to an address (often the container's internal hostname) the client can't resolve.
- **Difference between `listeners` and `advertised.listeners`?** What the broker binds to internally vs what it tells clients to use to reach it — legitimately different, and how one broker serves both in-network and host clients via separate listener names.
- **How would you verify a broker is healthy without writing app code?** CLI tools — `kafka-topics.sh --list`, and an end-to-end console producer/consumer pair.

## Core concepts (Module 2)

- **What guarantees ordering?** Partition, not topic; only within a single partition; same key → same partition.
- **More consumers than partitions?** Extras sit idle — parallelism capped at partition count.
- **Consumer groups: how do they give both load-balancing and pub/sub?** Same group splits work (each partition to one member); different groups each get an independent full copy.
- **What's a rebalance, and why can it hurt production?** Partition reassignment on membership change; eager = stop-the-world for the whole group; cooperative-sticky = only affected partitions pause; slow processing exceeding `max.poll.interval.ms` is a common accidental trigger.
- **`replicas=1` — what's the risk?** Zero fault tolerance; losing that broker loses the partition's data.
- **Retention vs compaction?** Time/size-based deletion of an event stream vs keep-only-latest-value-per-key for state/changelog topics.
- **Is Kafka "exactly-once" really exactly-once end-to-end?** No — only Kafka-to-Kafka (transactional produce + `read_committed` consume). Any external side effect (DB write, API call) still needs an idempotent consumer or an outbox pattern.
- **Why does offset-commit timing matter?** Commit before processing risks message loss on crash; commit after processing risks duplicate processing on crash/retry — hence idempotent consumer logic is needed regardless of which you choose.
- **ZooKeeper vs KRaft?** Legacy external coordination service vs Kafka's built-in Raft-based consensus (KRaft is the modern default, no external dependency).

## Internals (Module 3)

- **Why is Kafka fast?** Sequential append-only disk I/O, OS page cache instead of JVM-heap caching, zero-copy `sendfile` for consumer fetches, batching at every layer.
- **Log-end-offset vs high watermark?** LEO is "next offset this replica will write"; HW is "highest offset replicated to all ISR members" — consumers only read up to the HW, the actual durability boundary.
- **What does `acks=all` mechanically rely on?** The high watermark advancing past the produced offset — i.e., enough in-sync replicas confirmed it, not just the leader.
- **What happens to log files once retention expires?** Whole segments are deleted once fully aged out; the active segment is never deleted regardless of its oldest record's age — deletion happens in segment-sized chunks.
- **What's the controller, and how does KRaft change its election?** Broker responsible for leader election/metadata propagation; KRaft replaces ZooKeeper-coordinated election with Kafka's own Raft-based controller quorum.
- **What does `unclean.leader.election.enable=true` trade off?** Availability over durability — elects an out-of-date replica as leader, accepting silent data loss, to restore service faster.

## APIs (Module 4)

- **Is `producer.send()` sync or async?** Async by default, returns a `Future` — must attach a callback or block on `.get()` to observe failures; discarding the return value hides send failures.
- **`subscribe()` vs `assign()`?** Group-managed assignment with rebalancing vs manual partition pinning, no group coordination.
- **Why would a healthy consumer get evicted from its group?** Time between `poll()` calls exceeded `max.poll.interval.ms` — Kafka presumes it's stuck even though it's just slow.
- **Is `KafkaConsumer` thread-safe?** No — single-threaded access per instance required.
- **How do you implement backpressure without leaving the consumer group?** `pause()` assigned partitions while still calling `poll()` (for heartbeats), `resume()` once ready.
- **Why does `ConsumerRebalanceListener.onPartitionsRevoked` matter?** Last chance to commit offsets for already-processed records before the partition moves, avoiding reprocessing by the next owner.
- **What does `sendOffsetsToTransaction` do?** Ties a consumer's offset commit to the same atomic transaction as an outgoing produce — the real mechanism behind consume-transform-produce exactly-once.
- **How is consumer lag actually computed?** `AdminClient.listOffsets` (latest per partition) minus `listConsumerGroupOffsets` (committed per partition).
- **Kafka Streams vs a hand-written consumer that republishes?** Streams gives windowing, joins, local state stores, and exactly-once Kafka-to-Kafka processing built in.
- **What's Kafka Connect for?** Config-driven source/sink connectors without hand-written producer/consumer code.

## Configuration (Module 5)

- **`acks=0` vs `1` vs `all`?** No ack/fastest-least-durable vs leader-only vs leader+ISR (governed by `min.insync.replicas`)/safest.
- **Why pair `enable.idempotence=true` with `acks=all`?** Idempotence needs the strongest ack guarantee to be meaningful; together, exactly-once producer-to-partition semantics for the write itself.
- **Spring's `AckMode` vs raw `enable.auto.commit`?** Spring's container-level ack mode (default `BATCH`) governs commit timing relative to listener method completion — not simply delegating to the raw client's auto-commit flag.
- **Why can't `listener.concurrency` exceed partition count usefully?** Each concurrent consumer thread is a separate group member; partitions can't be split further than their count.
- **Why can't you decrease partition count?** No native support for partition removal/log merging — requires a new topic and data migration.
- **Risk of `spring.json.trusted.packages=*`?** Deserialization-gadget attack surface — any class on the classpath becomes instantiable from an untrusted payload's type header.
- **Why isn't a `DefaultErrorHandler` bean alone enough to route malformed messages to a DLT?** Deserialization happens inside `poll()`, before your listener or its error handler runs — needs `ErrorHandlingDeserializer` wrapping the real deserializer.
- **When would you use a batch listener over a record listener?** Per-record overhead dominates and bulk operations are available — tradeoff is more complex partial-batch failure handling.
- **Does `ChainedKafkaTransactionManager` give a true distributed transaction between Kafka and a DB?** No — best-effort sequential commit, not two-phase commit; the outbox pattern is the rigorous alternative.

## Patterns (Module 6)

- **How do you handle a poison-pill message?** Bounded retries with backoff for transient errors, then dead-letter topic; never retry forever (blocks the partition) or drop silently.
- **`DefaultErrorHandler` retries vs `@RetryableTopic`?** Blocking in-place retry (pauses the partition) vs non-blocking retry via separate per-attempt topics (partition keeps moving).
- **How do you achieve idempotent consumption?** Dedupe by a stable message id, or design the write to be naturally idempotent (upsert-by-id instead of increment).
- **Transactional outbox pattern — what problem does it solve?** Atomicity between a local DB write and a Kafka publish, at the producer side — write to an outbox table in the same local transaction, relay asynchronously (often via CDC).
- **Does Kafka's exactly-once semantics cover writes to an external database?** No — only Kafka-to-Kafka; external-system writes need an idempotent consumer or outbox pattern regardless.
- **What's consumer lag and why does it matter?** Gap between latest and committed offset; the primary signal consumers can't keep up.
- **`RecordTooLargeException` — where could the limit be coming from?** Producer's `max.request.size`, broker/topic's `message.max.bytes`, or a mismatched consumer fetch limit — need to be kept consistent.
- **Why can't trace context propagate across a Kafka produce/consume boundary implicitly?** Genuine process/thread boundary with an async gap — must explicitly propagate via record headers (or tracing instrumentation that does this for you).
- **Single topic with a type field vs one topic per event type?** Whether consumers need cross-type ordering for one entity (favors single topic) vs only ever want one type regardless of source (favors per-type topics).
- **`EmbeddedKafka` vs Testcontainers?** Fast in-process broker for everyday tests vs a real Dockerized broker for closer-to-production fidelity.
- **Why introduce a Schema Registry over raw JSON?** Enforced backward/forward compatibility across independently-deployed producers/consumers, smaller payloads; unnecessary overhead for a single team owning both ends.

## The "gotcha" question set (the ones that separate surface knowledge from real experience)

1. Kafka doesn't delete on consume.
2. Ordering is per-partition (per-key), never topic-wide.
3. Partition count can only go up, never down, and increasing it reshuffles key→partition mapping.
4. Rebalances can be triggered by slow processing, not just crashes.
5. Kafka's exactly-once is Kafka-to-Kafka only.
6. A discarded producer `Future`/callback hides send failures completely.
7. `KafkaConsumer` is not thread-safe.
8. Spring's ack mode, not the raw auto-commit flag, governs Spring Kafka's commit timing.
9. A plain `JsonDeserializer` failure happens too early for `DefaultErrorHandler` to catch alone — needs `ErrorHandlingDeserializer`.
10. Kafka's speed comes from sequential I/O + page cache + zero-copy + batching, not any single trick.
11. The high watermark, not the leader's own log position, is what actually gates what consumers can read.
