# Module 4 — The APIs

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

**Gotcha:** `poll()` must be called regularly. If your processing between `poll()` calls takes longer than `max.poll.interval.ms` (Module 5), Kafka assumes the consumer is stuck/dead and kicks it from the group — **even though the process is alive and still working**, just slow. This triggers an unwanted rebalance and, depending on commit timing, can cause the same records to be reprocessed by whichever consumer picks up that partition next. This is the single most common "why did my consumer get rebalanced for no reason" production issue.

**Gotcha 2:** a `KafkaConsumer` instance is **not thread-safe** — you cannot call `poll()` from one thread and `commit()` from another concurrently. If you want to process records on multiple threads, you either read into a queue and hand off records to worker threads (committing carefully once they're done), or you run multiple consumer instances (which Spring's `concurrency` setting does for you, each with its own consumer under the hood).

### The rest of the Consumer API you'll actually reach for

- **`seek(partition, offset)`** — jump the consumer's next fetch to a specific offset, bypassing the normal "wherever I left off" flow. Used for manual replay (e.g. an ops tool that resets a group back to a known-good offset) or custom offset-management schemes (storing offsets somewhere other than Kafka, e.g. in the same transaction as your DB write, then `seek`ing to the stored offset on startup instead of relying on `__consumer_offsets`).
- **`pause(partitions)` / `resume(partitions)`** — stop/restart fetching from specific partitions without leaving the consumer group (no rebalance triggered). The standard backpressure pattern: if a downstream dependency (e.g. Mongo) is overloaded, `pause()` all assigned partitions, keep calling `poll()` (required to stay alive in the group / send heartbeats) but ignore the empty results, then `resume()` once the dependency recovers.
- **`ConsumerRebalanceListener`** (`onPartitionsRevoked` / `onPartitionsAssigned`) — a callback invoked around rebalances. The critical use: **committing offsets for records you've already processed but not yet committed, inside `onPartitionsRevoked`, before the partition is handed to another consumer** — otherwise a rebalance mid-batch can cause the next owner to reprocess records the old owner already finished, purely because the commit hadn't happened yet. Spring Kafka's container manages this for you when using its standard ack modes, but it's worth knowing the raw hook exists, because `ConsumerAwareRebalanceListener` is the Spring-level equivalent you can plug in for custom pre-revocation logic (e.g. flushing an in-memory batch before losing the partition).
- **`beginningOffsets(partitions)` / `endOffsets(partitions)`** — fetch the earliest/latest available offsets without moving the consumer's position; this is exactly how lag is computed (latest offset minus committed offset) by monitoring tools.

**Gotcha:** forgetting to keep calling `poll()` while partitions are paused is a common mistake — `poll()` isn't just "get records," it's also what drives heartbeats and rebalance participation under the hood. Stopping `poll()` entirely (rather than pausing partitions and continuing to poll) gets you evicted from the group exactly like the slow-processing case in the gotcha above.

### Kafka transactions API (the actual methods, not just the concept)

Module 6 covers *when* to reach for Kafka transactions; here's the API shape so it's not a black box:

```java
producer.initTransactions();          // once, at startup — registers this producer's transactional.id with the broker

producer.beginTransaction();
try {
    producer.send(new ProducerRecord<>("orders-validated", key, value));
    // if this producer is also a consumer in a consume-transform-produce pipeline,
    // include the input offsets in the same transaction so they only commit if the produce does:
    producer.sendOffsetsToTransaction(offsetsToCommit, consumerGroupMetadata);
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}
```

`sendOffsetsToTransaction` is the piece that actually delivers "consume-transform-produce exactly-once" — it ties the consumer's offset commit to the *same* atomic transaction as the outgoing produce, so a crash between "produced the output" and "committed the input offset" can't happen; either both land or neither does. Spring Kafka wraps this whole flow via `KafkaTransactionManager` (Module 5) so you rarely call these methods directly, but knowing they exist is what makes "how does Kafka Streams get exactly-once" answerable rather than magic.

## 3. Admin API

Programmatic cluster administration: create/list/delete/describe topics, alter configs, manage ACLs. In Spring Boot this shows up as `NewTopic` beans (auto-registered via `KafkaAdmin`, which is what your `KafkaTopicConfig.eventTopic()` bean uses under the hood) or direct `AdminClient` usage for anything dynamic (e.g. a script that creates topics for every tenant).

```java
AdminClient admin = AdminClient.create(props);
admin.createTopics(List.of(new NewTopic("event-topic", 3, (short) 1)));
```

**Gotcha:** `NewTopic` beans in Spring are declarative but **idempotent-ish only for creation** — if the topic already exists with different settings (e.g. different partition count), Spring's `KafkaAdmin` will NOT retroactively change it; you'd need to alter it manually or via the Admin API. Don't expect changing `.partitions(3)` to `.partitions(6)` in code to actually resize an existing topic on redeploy.

**Programmatic lag inspection** — the thing behind every "consumer lag" dashboard (Module 6) is just Admin API calls:

```java
AdminClient admin = AdminClient.create(props);

Map<TopicPartition, OffsetAndMetadata> committed = admin
    .listConsumerGroupOffsets("event-consumer-group")
    .partitionsToOffsetAndMetadata().get();

Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> latest = admin
    .listOffsets(committed.keySet().stream()
        .collect(Collectors.toMap(tp -> tp, tp -> OffsetSpec.latest())))
    .all().get();

committed.forEach((tp, committedOffset) -> {
    long latestOffset = latest.get(tp).offset();
    long lag = latestOffset - committedOffset.offset();
    System.out.printf("partition=%d lag=%d%n", tp.partition(), lag);
});
```

This is exactly what `kafka-consumer-groups.sh --describe` does under the hood, and what you'd write if you needed lag exposed as a custom application metric rather than relying on the CLI or an external UI.

## 4. Streams API (brief — not used in your project, but expect interview questions)

A separate library (`kafka-streams`) for building stream-processing applications *on top of* the consumer/producer APIs: filtering, joining two topics, windowed aggregations, maintaining local state (`KTable`) backed by a changelog topic. Think "SQL-like continuous queries over topics," e.g. "count events per user in 5-minute windows and produce the result to another topic."

- **`KStream`** — an unbounded stream of records (like your raw event topic).
- **`KTable`** — a changelog / "latest value per key" view (conceptually the compacted-topic idea from Module 2, materialized as a table you can look up).

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

Understanding the raw client (Module 7 walks through a minimal example) matters even though you'll write Spring code day-to-day, because **every Spring Kafka config property maps 1:1 to a raw client property** — `spring.kafka.consumer.properties.max.poll.records` is just Spring passing `max.poll.records` straight through to the underlying `ConsumerConfig`. Knowing the raw client demystifies what Spring's annotations are actually doing.

## Interview questions for this module

1. **"Is `producer.send()` synchronous or asynchronous by default?"** — Asynchronous; returns a `Future` immediately; you must attach a callback or call `.get()` to observe the result.
2. **"What's the difference between `subscribe()` and `assign()`?"** — Group-managed partition assignment (with rebalancing) vs manual partition pinning (no group coordination).
3. **"Why would a consumer get removed from its group even though the process is alive?"** — Processing between `poll()` calls exceeded `max.poll.interval.ms`; Kafka presumes it's stuck.
4. **"Is `KafkaConsumer` thread-safe?"** — No; single-threaded access per consumer instance is required.
5. **"What's the difference between Kafka Streams and just writing a consumer that calls another topic's producer?"** — Streams gives you exactly-once processing guarantees, windowing, local state stores, and a DSL for joins/aggregations, without hand-rolling that yourself.
6. **"What's Kafka Connect for, and would you use it here?"** — Config-driven source/sink connectors for moving data in/out of Kafka without custom code; a MongoDB sink connector is a real alternative to a hand-written `@KafkaListener` consumer at scale.
7. **"How would you implement backpressure in a Kafka consumer without leaving the consumer group?"** — `pause()` assigned partitions while continuing to call `poll()` (to keep sending heartbeats), then `resume()` once the downstream dependency recovers.
8. **"Why is `ConsumerRebalanceListener.onPartitionsRevoked` important for correctness?"** — It's your last chance to commit offsets for already-processed records before the partition moves to another consumer; skipping this risks the new owner reprocessing records the old owner already finished.
9. **"What does `sendOffsetsToTransaction` actually do?"** — Ties a consumer's offset commit to the same atomic transaction as an outgoing produce, which is the real mechanism behind consume-transform-produce exactly-once processing.
10. **"How is consumer lag actually computed under the hood?"** — `AdminClient.listOffsets` (latest offset per partition) minus `listConsumerGroupOffsets` (committed offset per partition) — exactly what `kafka-consumer-groups.sh --describe` and every lag dashboard do.
