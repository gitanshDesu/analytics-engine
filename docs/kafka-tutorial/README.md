# Kafka Tutorial

A complete, self-contained Kafka tutorial written against this project's own Kafka integration (`analytics-backend`) as the running example, so concepts are grounded in real code, not invented samples. Follow the modules in order — this is meant to be the single place to look, from "what's a message broker" through running a cluster, core concepts, internals, the full API surface, Spring Boot configuration, production patterns, a worked example, a hands-on task, troubleshooting, and interview prep (both fact-recall and system design).

0. [Why a message broker — and what event streaming adds](00-why-message-broker.md) — the problem it solves, Kafka vs RabbitMQ/SQS, when (not) to use it, event notification vs event-carried state transfer vs event sourcing, CQRS, CDC
1. [Running a local Kafka cluster](01-local-kafka-setup.md) — docker-compose and single `docker run` (KRaft, single-node), the `advertised.listeners` gotcha, verifying with CLI tools
2. [Core concepts](02-core-concepts.md) — topics, partitions, offsets, keys, consumer groups, rebalancing, replication, retention/compaction, delivery semantics, ZooKeeper vs KRaft
3. [Internals — why Kafka is fast](03-kafka-internals.md) — sequential I/O, page cache, zero-copy, high watermark/log-end-offset, log segments, controller election/KRaft quorum, unclean leader election
4. [The APIs](04-apis.md) — Producer, Consumer (including `seek`/`pause`/`resume`/rebalance listeners), Admin (including lag inspection), Streams, Connect, the Kafka transactions API; raw client vs Spring Kafka
5. [Spring Boot configuration, value by value](05-spring-boot-config.md) — every producer/consumer/listener/topic property, `ErrorHandlingDeserializer`, batch listeners, `KafkaTransactionManager`/`ChainedKafkaTransactionManager`, annotated against this repo's actual config
6. [Industry-standard patterns](06-patterns.md) — dead-letter topics, `@RetryableTopic`, idempotent consumers, outbox pattern, transactions, lag monitoring, testing, schema registry, message size limits, tracing, topic design, security — each tied to a real gap found in this codebase
7. [Worked example](07-worked-example.md) — a small order-events pipeline, raw client → Spring → deliberately broken → fixed with a DLT (correctly wired with `ErrorHandlingDeserializer`)
8. [Hands-on task](08-hands-on-task.md) — build a notifications service yourself, then apply the same fixes back to the real `EventController`/`EventConsumer`
9. [Troubleshooting runbook](09-troubleshooting-runbook.md) — symptom-first index ("lag keeps growing," "messages out of order," "duplicates," "rebalance storm"...) cross-referenced back to the module that explains the cause
10. [System design interview questions](10-system-design-questions.md) — scenario-based questions (design a notification system, an order pipeline, guarantee exactly-once payments...) with what a strong answer covers
11. [Consolidated interview cheat sheet](11-interview-questions.md) — quick-recall pass over every fact-recall question embedded in modules 0-9

Each module includes gotchas, pros/cons, and comparisons against alternative approaches inline — read a module fully rather than skimming for code snippets, the tradeoffs are where the interview-readiness comes from.

See also: [`../kafka-tutorial-plan.md`](../kafka-tutorial-plan.md) for the original curriculum outline this was built from.
