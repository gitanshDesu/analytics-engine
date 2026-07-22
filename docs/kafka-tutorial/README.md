# Kafka Tutorial

A complete, self-contained Kafka tutorial written against this project's own Kafka integration (`analytics-backend`) as the running example, so concepts are grounded in real code, not invented samples. Follow the modules in order.

1. [Why a message broker at all](00-why-message-broker.md) — the problem it solves, Kafka vs RabbitMQ/SQS, when (not) to use it
2. [Core concepts](01-core-concepts.md) — topics, partitions, offsets, keys, consumer groups, rebalancing, replication, retention/compaction, delivery semantics, ZooKeeper vs KRaft
3. [The APIs](02-apis.md) — Producer, Consumer, Admin, Streams, Connect; raw client vs Spring Kafka
4. [Spring Boot configuration, value by value](03-spring-boot-config.md) — every producer/consumer/listener/topic property, annotated against this repo's actual config
5. [Industry-standard patterns](04-patterns.md) — dead-letter topics, idempotent consumers, outbox pattern, transactions, lag monitoring, testing, schema registry, security — each tied to a real gap found in this codebase
6. [Worked example](05-worked-example.md) — a small order-events pipeline, raw client → Spring → deliberately broken → fixed with a DLT
7. [Hands-on task](06-hands-on-task.md) — build a notifications service yourself, then apply the same fixes back to the real `EventController`/`EventConsumer`
8. [Consolidated interview cheat sheet](07-interview-questions.md) — quick-recall pass over every question embedded in modules 1-7

Each module includes gotchas, pros/cons, and comparisons against alternative approaches inline — read a module fully rather than skimming for code snippets, the tradeoffs are where the interview-readiness comes from.

See also: [`../kafka-tutorial-plan.md`](../kafka-tutorial-plan.md) for the original curriculum outline this was built from.
