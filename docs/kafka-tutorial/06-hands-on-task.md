# Module 6 — Hands-On Integration Task

This is new code you write yourself — not a copy of Module 5's example. The point is to make the decisions (partition count, key choice, acks, error handling, idempotency, a test) without a template to lean on, since that's what an interview or a real ticket will ask of you.

## The task: a notifications service

Build a small two-part system:

1. **Producer side:** a REST endpoint `POST /notifications` accepting `{ userId, message, channel }` (`channel` is e.g. `"email"` or `"sms"`), which publishes to a `notifications` topic.
2. **Consumer side:** a listener in a `notification-consumer-group` that "sends" the notification — for this exercise, just log it or write it into an in-memory map/H2 table, no real email/SMS integration needed. Deliberately simulate failure: make the "send" step throw ~10% of the time (e.g. `if (ThreadLocalRandom.current().nextInt(10) == 0) throw new RuntimeException("simulated send failure")`), so you have something real to handle.

## Requirements you must satisfy (this is where the learning happens — don't skip any)

1. **Topic config:** create the `notifications` topic with 3 partitions. Choose the partition key yourself and be ready to justify it — what should stay ordered relative to what? (Hint: think about whether two notifications to the *same* user need to arrive/process in send order, and pick the key accordingly — same reasoning `EventController` applied by keying on `sessionId`.)
2. **Producer durability:** explicitly set `acks=all` and `enable.idempotence=true` on the producer, and write a one-line comment next to the config justifying the choice versus the defaults — connect it back to what you'd lose by not setting them (Module 3).
3. **Error handling:** wire up a `DefaultErrorHandler` with a bounded backoff (e.g. 3 retries, exponential) and a `DeadLetterPublishingRecoverer`, so the simulated 10% failures end up on `notifications.DLT` after retries are exhausted instead of vanishing. Write a small separate consumer (or a test) that reads `notifications.DLT` and prints what landed there, so you've verified the whole path, not just assumed it works.
4. **Idempotent consumption:** generate a stable notification id (client- or server-side, your choice, but be consistent) and make the "send" operation idempotent against redelivery — e.g. an upsert keyed by that id, or a dedupe-check before sending. Prove to yourself it works: manually redeliver the same message twice (e.g. reset the consumer group's offset backward and let it reprocess) and confirm the side effect doesn't double up.
5. **One test:** write an `@EmbeddedKafka` integration test that posts to `/notifications` via `MockMvc`/`WebTestClient`, and asserts a message with the expected key/payload actually lands on the `notifications` topic. Bonus: a second test that publishes a malformed message directly and asserts it ends up on `notifications.DLT`.

## Self-check questions before you consider it done

- If I kill my consumer process mid-processing and restart it, do I get duplicate side effects? (Should be no, given requirement 4.)
- If I send 10 notifications for the same `userId` in quick succession, are they guaranteed to be processed in the order I sent them? (Should be yes, if your key choice in requirement 1 was correct — verify by logging timestamps.)
- What happens if the broker is completely unreachable when I call `POST /notifications`? Does my endpoint report failure, or does it lie and return success anyway? (Ties back to the "discarded `Future`" gap found in the real codebase — don't repeat it here.)

## Stretch goal — apply this back to the real codebase

Once the above works, go fix the same four gaps in `analytics-backend`'s actual `EventController`/`EventConsumer`:

1. Add a `DefaultErrorHandler` + `DeadLetterPublishingRecoverer` bean, so a `ResourceNotFoundException` (session not found) or malformed event lands on `event-topic.DLT` instead of being silently dropped.
2. Stop discarding `kafkaTemplate.send()`'s return value in `EventController` — attach a callback that at least logs failures.
3. Make the session `eventCount`/`pageViews` update idempotent against redelivery, or wrap the `Session` update and `Event` insert in a single Mongo transaction (or both).
4. Scope `spring.kafka.consumer.properties.spring.json.trusted.packages` down from `*` to the actual DTO package.

This is genuinely useful work, not just practice — these are the concrete gaps already identified in this project's Kafka integration.
