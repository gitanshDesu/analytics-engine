# Module 2 — The APIs

Kafka exposes five distinct client APIs. You'll mostly touch two directly (Producer, Consumer); know what the others are for even if Spring hides them.

## 1. Producer API

Core call: `producer.send(ProducerRecord<K,V> record, Callback callback)`.

Two usage modes:

```java
// Fire-and-forget-ish, but you still get a Future — discarding it is the mistake
Future<RecordMetadata> future = producer.send(record);

// Async with callback — the recommended pattern, this is how you actually observe failures
producer.send(record, (metadata, exception) -> {
    if (exception != null) {
        log.error("send failed for key={}", record.key(), exception);
        // metrics, DLT, alert — your call
    }
});

// Fully synchronous (blocks until ack) — rarely what you want, kills throughput
producer.send(record).get();
```

**Gotcha:** `send()` is asynchronous by default — it queues the record into an internal buffer and returns immediately; the actual network write happens on a background I/O thread, batched with other records. If you never attach a callback and never call `.get()`, you have **no way of knowing whether the message was ever actually delivered.** This is exactly the bug flagged in `EventController` — `kafkaTemplate.send(...)` return value is discarded on both endpoints.

**Gotcha 2:** calling `.get()` on every send (fully sync) defeats the purpose of the client-side batching (`linger.ms`/`batch.size`) — you serialize sends one at a time and throughput collapses. Use the callback form, not blocking sync sends, in a hot path.

## 2. Consumer API

Core loop — this is the shape every Kafka consumer eventually reduces to, even Spring's `@KafkaListener` under the hood:

```java
consumer.subscribe(List.of("event-topic"));
while (running) {
    ConsumerRecords<String, EventRequest> records = consumer.poll(Duration.ofMillis(500));
    for (ConsumerRecord<String, EventRequest> record : records) {
        process(record);           // your business logic
    }
    consumer.commitSync();          // or commitAsync(), or manual per-partition commit
}
```

Key facts:
- **`poll()` is a pull, not a push.** The client library actively asks the broker for more records; nothing arrives unsolicited. This is different from many message queue client libraries which push messages to a registered handler.
- **`subscribe()` vs `assign()`** — `subscribe(topics)` joins a consumer group and lets Kafka assign partitions (the normal case, what `@KafkaListener` uses). `assign(partitions)` manually pins a consumer to specific partitions, bypassing group coordination and rebalancing entirely — used for niche cases (e.g. a tool that needs to read one specific partition, or a stateful consumer that manages its own partition ownership).
- **`commitSync()` vs `commitAsync()`** — sync blocks until the broker confirms the commit (safer, slower); async doesn't block but failures are only visible via a callback, and out-of-order completions can commit an older offset after a newer one succeeded (usually handled by a callback that only accepts commits for the latest offset).

**Gotcha:** `poll()` must be called regularly. If your processing between `poll()` calls takes longer than `max.poll.interval.ms` (Module 3), Kafka assumes the consumer is stuck/dead and kicks it from the group — **even though the process is alive and still working**, just slow. This triggers an unwanted rebalance and, depending on commit timing, can cause the same records to be reprocessed by whichever consumer picks up that partition next. This is the single most common "why did my consumer get rebalanced for no reason" production issue.

**Gotcha 2:** a `KafkaConsumer` instance is **not thread-safe** — you cannot call `poll()` from one thread and `commit()` from another concurrently. If you want to process records on multiple threads, you either read into a queue and hand off records to worker threads (committing carefully once they're done), or you run multiple consumer instances (which Spring's `concurrency` setting does for you, each with its own consumer under the hood).

## 3. Admin API

Programmatic cluster administration: create/list/delete/describe topics, alter configs, manage ACLs. In Spring Boot this shows up as `NewTopic` beans (auto-registered via `KafkaAdmin`, which is what your `KafkaTopicConfig.eventTopic()` bean uses under the hood) or direct `AdminClient` usage for anything dynamic (e.g. a script that creates topics for every tenant).

```java
AdminClient admin = AdminClient.create(props);
admin.createTopics(List.of(new NewTopic("event-topic", 3, (short) 1)));
```

**Gotcha:** `NewTopic` beans in Spring are declarative but **idempotent-ish only for creation** — if the topic already exists with different settings (e.g. different partition count), Spring's `KafkaAdmin` will NOT retroactively change it; you'd need to alter it manually or via the Admin API. Don't expect changing `.partitions(3)` to `.partitions(6)` in code to actually resize an existing topic on redeploy.

## 4. Streams API (brief — not used in your project, but expect interview questions)

A separate library (`kafka-streams`) for building stream-processing applications *on top of* the consumer/producer APIs: filtering, joining two topics, windowed aggregations, maintaining local state (`KTable`) backed by a changelog topic. Think "SQL-like continuous queries over topics," e.g. "count events per user in 5-minute windows and produce the result to another topic."

- **`KStream`** — an unbounded stream of records (like your raw event topic).
- **`KTable`** — a changelog / "latest value per key" view (conceptually the compacted-topic idea from Module 1, materialized as a table you can look up).

Not needed for a simple produce-and-persist-to-Mongo pipeline like `EventConsumer`, but relevant if you later want, say, a real-time "events per session in the last minute" aggregation without hitting Mongo for it.

## 5. Connect API (brief)

A framework for **source connectors** (pull data *into* Kafka from an external system, e.g. Debezium capturing MySQL row changes into a topic) and **sink connectors** (push data *out of* Kafka into an external system, e.g. a JDBC sink writing every record to a Postgres table) — all configuration-driven, no hand-written producer/consumer code.

Relevant context for you: your `EventConsumer` is essentially a hand-written "sink" (Kafka → Mongo). At larger scale or with more such pipelines, a MongoDB sink connector (Kafka Connect has one) is a legitimate alternative to hand-rolling `@KafkaListener` consumers — trades code control for configuration-driven ops. Not a change to make now, just know the option exists.

## Comparison: raw Kafka client vs Spring Kafka

| | Raw `kafka-clients` | Spring Kafka |
|---|---|---|
| Producer send | Manual `KafkaProducer.send()` + callback | `KafkaTemplate.send()` — same underlying mechanics, less boilerplate, integrates with Spring transactions |
| Consumer loop | Hand-written `while` + `poll()` loop, manual thread management | `@KafkaListener` — container manages the poll loop, threading (`concurrency`), and commit for you |
| Config | Raw `Properties` objects | `application.properties`/`.yml`, type-safe-ish via `spring.kafka.*` |
| Testing | Manual `MockProducer`/embedded broker wiring | `@EmbeddedKafka` annotation does the wiring |
| When to use raw client | Learning/understanding what's underneath; non-Spring apps; very custom threading/partition-assignment needs | Default choice for any Spring Boot service — which is what your project already does |

Understanding the raw client (Module 5 walks through a minimal example) matters even though you'll write Spring code day-to-day, because **every Spring Kafka config property maps 1:1 to a raw client property** — `spring.kafka.consumer.properties.max.poll.records` is just Spring passing `max.poll.records` straight through to the underlying `ConsumerConfig`. Knowing the raw client demystifies what Spring's annotations are actually doing.

## Interview questions for this module

1. **"Is `producer.send()` synchronous or asynchronous by default?"** — Asynchronous; returns a `Future` immediately; you must attach a callback or call `.get()` to observe the result.
2. **"What's the difference between `subscribe()` and `assign()`?"** — Group-managed partition assignment (with rebalancing) vs manual partition pinning (no group coordination).
3. **"Why would a consumer get removed from its group even though the process is alive?"** — Processing between `poll()` calls exceeded `max.poll.interval.ms`; Kafka presumes it's stuck.
4. **"Is `KafkaConsumer` thread-safe?"** — No; single-threaded access per consumer instance is required.
5. **"What's the difference between Kafka Streams and just writing a consumer that calls another topic's producer?"** — Streams gives you exactly-once processing guarantees, windowing, local state stores, and a DSL for joins/aggregations, without hand-rolling that yourself.
6. **"What's Kafka Connect for, and would you use it here?"** — Config-driven source/sink connectors for moving data in/out of Kafka without custom code; a MongoDB sink connector is a real alternative to a hand-written `@KafkaListener` consumer at scale.
