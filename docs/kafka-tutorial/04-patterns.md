# Module 4 — Industry-Standard Patterns

Each pattern here is introduced as the fix for a specific gap already found in `analytics-backend`'s Kafka code, so you see it land as a real fix, not abstract theory.

## 1. Error handling: retries, backoff, dead-letter topics

**The problem it solves:** right now, `EventConsumer.consume()` throws `ResourceNotFoundException` when a session isn't found, or would throw on malformed JSON. With no error handler configured, Spring Kafka's default `DefaultErrorHandler` retries a fixed number of times, then logs and **moves on, committing the offset** — the event is gone, with no record it ever existed.

**The fix — a `DefaultErrorHandler` with backoff + a dead-letter topic (DLT):**

```java
@Bean
public DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<Object, Object> template) {
    var recoverer = new DeadLetterPublishingRecoverer(template,
        (record, ex) -> new TopicPartition(record.topic() + ".DLT", record.partition()));

    var backOff = new ExponentialBackOffWithMaxRetries(3);
    backOff.setInitialInterval(500L);
    backOff.setMultiplier(2.0);
    backOff.setMaxInterval(5_000L);

    DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backOff);
    // Don't retry on errors that will never succeed no matter how many times you retry them
    handler.addNotRetryableExceptions(com.fasterxml.jackson.core.JsonProcessingException.class);
    return handler;
}
```

Spring auto-wires this into your `@KafkaListener` container factory once it's a bean. After 3 retries (500ms, 1s, 2s backoff) still failing, the record is published to `event-topic.DLT` instead of being silently dropped — you get a durable, inspectable record of what failed and why (the recoverer attaches exception details as headers).

**Retryable vs non-retryable errors — decide per exception type:**

| Error type | Example | Retry? |
|---|---|---|
| Transient / infrastructure | Mongo connection blip, network timeout | Yes — likely to succeed on retry |
| Permanent / data error | Malformed JSON, `ResourceNotFoundException` for a session that will never exist | No — retrying wastes time and delays the DLT publish; mark non-retryable so it goes straight to the DLT |

**Gotcha:** a DLT is a dead end unless something reads it. Build (even a simple, manual) tooling to inspect and, where appropriate, replay DLT messages — otherwise it's just a slightly more polite version of silently dropping data.

**Comparison — alternative ways to handle poison messages:**

| Approach | Pros | Cons |
|---|---|---|
| No handling (current state) | Simplest | Silent data loss — unacceptable for anything you care about |
| Retry forever, no DLT | Never silently drops | A single poison message blocks that partition indefinitely (retries happen before moving to the next offset) — one bad record can halt an entire partition's consumer |
| Retry + DLT (recommended) | Bounded retry time, durable record of failures, partition keeps moving | Requires building DLT-monitoring/replay tooling |
| Skip immediately, log only | Never blocks | Same silent-loss problem as no handling, just with a log line — logs get missed/rotated |

## 2. Idempotent consumers

**The problem it solves:** at-least-once delivery (the realistic default once you fix offset-commit timing, see Module 3's ack-mode discussion) means the *same* message can be delivered and processed more than once — after a rebalance, a retry, or a consumer restart between "processed" and "committed." `EventConsumer`'s `mongoTemplate.findAndModify(... .inc("eventCount", 1) ...)` is **not** idempotent: reprocessing the same event increments the counter again.

**Two ways to make it idempotent:**

| Approach | How | Tradeoff |
|---|---|---|
| Dedupe table/set | Store a processed-message id (e.g. a UUID generated client-side per event, or a hash of the payload) in a "seen" collection; check-and-skip before processing | Extra storage + a lookup per message; fully general, works for any operation type |
| Make the operation itself naturally idempotent | Replace `$inc` with something where re-applying has no extra effect — e.g. store the event id as part of an upsert key so a duplicate write is a no-op, or compute `eventCount` by *counting* stored `Event` documents for a session (aggregation) rather than maintaining a separate incrementing counter | No extra storage for a dedupe table; only works when the underlying operation admits an idempotent formulation |

For `EventConsumer` specifically: since every event probably already has (or can have) a stable id, the cheapest fix is to require the SDK to send a client-generated `eventId` and use it as the Mongo `_id` on the `Event` document — a duplicate delivery becomes a duplicate-key write that's safely ignored, and `eventCount`/`pageViews` could be derived by aggregation instead of incremented, removing the double-count risk entirely. That's a bigger structural change than a quick patch, so it's called out here as the "real" fix rather than a band-aid retry-suppression hack.

**Gotcha:** message keys (`sessionId` in your case) are for **partitioning/ordering**, not deduplication — don't confuse the two. You need a separate identifier (per-event, not per-session) for idempotency checks.

## 3. Atomicity across Kafka and an external system (Mongo, in your case)

**The problem it solves:** `EventConsumer` does two separate writes — `findAndModify` on `Session`, then `eventRepo.save(newEvent)` — with no atomicity between them, and neither is atomic with the Kafka offset commit either. A crash between the two Mongo writes leaves counters incremented with no corresponding `Event` document.

**Comparison of ways to solve this class of problem:**

| Approach | How it works | Pros | Cons |
|---|---|---|---|
| Do nothing (current state) | Two independent writes | Simplest | Partial-failure inconsistency, as found in the review |
| Native Mongo multi-document transaction | Wrap both writes in a Mongo session/transaction (your replica set already supports this) | Both writes atomic; smallest change from current code | Transactions add latency; still doesn't cover the Kafka-offset-commit-vs-Mongo-write atomicity gap (that's a separate boundary) |
| Combine into one write | Model `Session` and `Event` so a single atomic operation covers both (e.g. store recent event summary embedded, or derive counters via aggregation instead of maintaining them at all) | Removes the two-write problem entirely | Requires a data-model rethink; not always feasible |
| Transactional outbox pattern | Producer side: instead of writing directly to two systems, write an "outbox" record in the *same* local transaction as your primary DB write, then a separate relay process publishes outbox rows to Kafka | Solves the general "DB write + Kafka publish must be atomic" problem *at the producer* | Adds a relay component (e.g. Debezium reading the outbox table's WAL/oplog) — real infrastructure, not a quick fix |
| Kafka transactions (`read_committed` + transactional producer) | Atomic multi-topic/multi-partition Kafka writes, consumer-side isolation level to only see committed records | Solves Kafka-to-Kafka atomicity precisely | Does **not** cover Kafka-to-external-system (Mongo) atomicity at all — a common misconception; only relevant for consume-transform-produce pipelines entirely within Kafka |

For your case specifically (single consumer, single external DB), the pragmatic fix is the **Mongo transaction** wrapping both writes, combined with **idempotent consumer logic** (previous section) — that combination gets you "processed exactly-once from the application's point of view" without needing outbox infrastructure. Reach for the outbox pattern only once you have a producer-side atomicity problem (i.e., the thing that writes to Mongo and *also* needs to publish to Kafka atomically, which is the reverse direction from your current consumer-side problem).

## 4. Kafka transactions & exactly-once semantics (know it, know its limits)

A transactional producer can atomically write to multiple partitions/topics, and a consumer set to `isolation.level=read_committed` only sees committed records. This is what powers Kafka Streams' exactly-once processing for consume-transform-produce pipelines entirely inside Kafka.

**Gotcha (repeat from Module 1, worth over-learning because it's the top interview trap):** this exactly-once guarantee is scoped to Kafka-to-Kafka. It gives you nothing for "consumed a Kafka record and also wrote to Mongo" — that boundary always needs either an idempotent consumer or an outbox-style pattern, never Kafka transactions alone.

## 5. Consumer lag monitoring

**Lag** = the difference between the latest offset in a partition and a consumer group's committed offset — i.e., how far behind the group is. It is the single most important Kafka health metric: rising, unbounded lag means your consumers can't keep up with producers (undersized `concurrency`, slow downstream writes, or a stuck consumer).

Options: Kafka's own `kafka-consumer-groups.sh --describe` CLI for ad hoc checks; a UI like Kafka UI / Redpanda Console for a running dashboard; Prometheus + the JMX exporter (or Micrometer's Kafka metrics binder, which Spring Boot Actuator wires up automatically if Actuator + Micrometer are on the classpath) for alerting.

**Gotcha:** lag measured only in "number of messages behind" can be misleading if message sizes/processing costs vary wildly — for a slow-varying workload also watch time-based lag (how old is the oldest unprocessed message) if available.

## 6. Testing

| Approach | How | Pros | Cons |
|---|---|---|---|
| `@EmbeddedKafka` (spring-kafka-test, already a dependency in your `build.gradle`) | Spins up an in-process, in-JVM broker for the test | Fast, no Docker needed, tightly integrated with Spring test context | Slightly diverges from real broker behavior in edge cases (some broker-version-specific quirks) |
| Testcontainers (Kafka module) | Spins up a real Kafka broker in a Docker container per test run | Closest to real production broker behavior | Slower, requires Docker in CI |
| Mocking (`MockProducer`, hand-rolled fakes) | No broker at all, just fake the client interfaces | Fastest, simplest for pure unit tests of your business logic | Doesn't test actual serialization, partitioning, or broker interaction — only good for testing logic that happens to depend on a producer/consumer interface |

You have `spring-boot-starter-kafka-test` declared as a dependency with **zero tests currently using it** — `@EmbeddedKafka` is the natural first addition: write one integration test that posts to `/api/v1/event/register`, asserts the message lands on `event-topic`, and (once the DLT handler exists) one that asserts a deliberately-malformed message lands on `event-topic.DLT` instead of vanishing.

## 7. Schema management: raw JSON vs Avro/Protobuf + Schema Registry

| | Raw JSON (your current approach, `JsonSerializer`/`JsonDeserializer`) | Avro/Protobuf + Schema Registry |
|---|---|---|
| Setup cost | Zero — just Jackson | Requires running/using a Schema Registry service, defining `.avsc`/`.proto` schemas |
| Payload size | Larger (field names repeated per message) | Smaller (binary encoding) |
| Compatibility enforcement | None — a producer can send any shape, consumer finds out at runtime (or silently gets nulls/defaults from Jackson) | Registry enforces compatibility rules (backward/forward) at publish time, catching breaking changes before they reach consumers |
| Best for | Small teams, single producer/consumer pair you fully control, early-stage projects (matches your current situation) | Multiple independent teams/services producing or consuming the same topic, where schema drift between them is a real operational risk |

Not a change to make now — raw JSON is a reasonable choice for a single-service pipeline you fully control — but know this exists and why larger organizations reach for it once more than one team touches the same topic.

## 8. Security (brief)

- **Encryption in transit:** SSL/TLS between clients and brokers.
- **Authentication:** SASL (PLAIN, SCRAM, Kerberos/GSSAPI, OAUTHBEARER).
- **Authorization:** ACLs — which principals can produce/consume/create on which topics.
- Local dev (like your `localhost:9092`, presumably `PLAINTEXT`) skips all of this; any real deployment needs at minimum TLS + SASL, and ACLs scoped so only your own services can produce to `event-topic` (this is also the actual fix for the two TODOs already in your `EventConsumer` about validating trackingId/origin — broker-level ACLs plus application-level trackingId validation are complementary, not either/or).

## Interview questions for this module

1. **"How do you handle a poison-pill message in a Kafka consumer?"** — Bounded retries with backoff for transient errors, then publish to a dead-letter topic; never retry forever (blocks the partition) or drop silently.
2. **"How do you achieve idempotent consumption?"** — Dedupe by a stable message id, or design the write itself to be naturally idempotent (upsert by id rather than increment).
3. **"Does Kafka's exactly-once semantics cover writes to an external database?"** — No — only Kafka-to-Kafka; external-system writes need an idempotent consumer or outbox pattern regardless.
4. **"What's the transactional outbox pattern and when would you use it?"** — Write to an outbox table in the same local transaction as your primary write, then relay outbox rows to Kafka asynchronously (e.g. via CDC) — solves atomic "DB write + Kafka publish" at the producer side.
5. **"What's consumer lag and why does it matter?"** — Offset gap between latest and committed; the primary signal that consumers can't keep up.
6. **"`EmbeddedKafka` vs Testcontainers — when would you pick each?"** — Embedded for fast, everyday integration tests; Testcontainers when you need behavior closer to a real broker or are testing broker-version-specific features.
7. **"Why might you introduce a Schema Registry instead of raw JSON?"** — Enforced compatibility across independently-deployed producers/consumers, smaller payloads; overkill for a single team owning both ends.
