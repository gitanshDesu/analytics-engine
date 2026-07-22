# Consolidated Kafka Interview Cheat Sheet

Quick-recall pass over everything in Modules 0-6. Each module file has these embedded in context with more explanation — use this file the night before an interview, use the module files to actually learn the material.

## Fundamentals

- **What is Kafka, why use it over a REST call?** Durable, replayable, partitioned log; decouples producer from consumer, absorbs backpressure, supports independent multi-consumer fan-out and replay.
- **Kafka vs RabbitMQ?** Log-based/replayable/consumer-tracks-own-offset vs smart-broker/routing-rich/message-deleted-on-ack.
- **When would you NOT use Kafka?** Low volume, no replay need, need strict global (not per-key) ordering, need synchronous request/reply, or operational simplicity matters more than throughput/replay.
- **Does Kafka delete a message once consumed?** No — retention/compaction policy governs deletion, independent of how many consumers have read it.

## Core concepts

- **What guarantees ordering?** Partition, not topic; only within a single partition; same key → same partition.
- **More consumers than partitions?** Extras sit idle — parallelism capped at partition count.
- **Consumer groups: how do they give both load-balancing and pub/sub?** Same group splits work (each partition to one member); different groups each get an independent full copy.
- **What's a rebalance, and why can it hurt production?** Partition reassignment on membership change; eager = stop-the-world for the whole group; cooperative-sticky = only affected partitions pause; slow processing exceeding `max.poll.interval.ms` is a common accidental trigger.
- **`replicas=1` — what's the risk?** Zero fault tolerance; losing that broker loses the partition's data.
- **Retention vs compaction?** Time/size-based deletion of an event stream vs keep-only-latest-value-per-key for state/changelog topics.
- **Is Kafka "exactly-once" really exactly-once end-to-end?** No — only Kafka-to-Kafka (transactional produce + `read_committed` consume). Any external side effect (DB write, API call) still needs an idempotent consumer or an outbox pattern.
- **Why does offset-commit timing matter?** Commit before processing risks message loss on crash; commit after processing risks duplicate processing on crash/retry — hence idempotent consumer logic is needed regardless of which you choose.
- **ZooKeeper vs KRaft?** Legacy external coordination service vs Kafka's built-in Raft-based consensus (KRaft is the modern default, no external dependency).

## APIs

- **Is `producer.send()` sync or async?** Async by default, returns a `Future` — must attach a callback or block on `.get()` to observe failures; discarding the return value hides send failures.
- **`subscribe()` vs `assign()`?** Group-managed assignment with rebalancing vs manual partition pinning, no group coordination.
- **Why would a healthy consumer get evicted from its group?** Time between `poll()` calls exceeded `max.poll.interval.ms` — Kafka presumes it's stuck even though it's just slow.
- **Is `KafkaConsumer` thread-safe?** No — single-threaded access per instance required.
- **Kafka Streams vs a hand-written consumer that republishes?** Streams gives windowing, joins, local state stores, and exactly-once Kafka-to-Kafka processing built in.
- **What's Kafka Connect for?** Config-driven source/sink connectors (e.g. CDC into Kafka, or a JDBC/Mongo sink out of Kafka) without hand-written producer/consumer code.

## Configuration

- **`acks=0` vs `1` vs `all`?** No ack/fastest-least-durable vs leader-only vs leader+ISR (governed by `min.insync.replicas`)/safest.
- **Why pair `enable.idempotence=true` with `acks=all`?** Idempotence needs the strongest ack guarantee to be meaningful; together, exactly-once producer-to-partition semantics for the write itself (still not exactly-once for external side effects).
- **Spring's `AckMode` vs raw `enable.auto.commit`?** Spring's container-level ack mode (default `BATCH`) governs commit timing relative to your listener method completing — it's not simply delegating to the raw client's auto-commit flag.
- **Why can't `listener.concurrency` exceed partition count usefully?** Each concurrent consumer thread is a separate group member; partitions can't be split further than their count.
- **Why can't you decrease partition count?** No native support for partition removal/log merging — would require a new topic and data migration.
- **Risk of `spring.json.trusted.packages=*`?** Deserialization-gadget attack surface — any class on the classpath becomes instantiable from an untrusted payload's type header.

## Patterns

- **How do you handle a poison-pill message?** Bounded retries with backoff for transient errors, then dead-letter topic; never retry forever (blocks the partition) or drop silently.
- **How do you achieve idempotent consumption?** Dedupe by a stable message id, or design the write to be naturally idempotent (upsert-by-id instead of increment).
- **Transactional outbox pattern — what problem does it solve?** Atomicity between a local DB write and a Kafka publish, at the producer side — write to an outbox table in the same local transaction, relay asynchronously (often via CDC).
- **What's consumer lag and why does it matter?** Gap between latest and committed offset per partition; the primary signal consumers can't keep up.
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
