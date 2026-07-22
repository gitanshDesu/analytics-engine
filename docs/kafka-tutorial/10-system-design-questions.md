# Module 10 — System Design Interview Questions

Fact-recall questions (Module 11) prove you know the pieces. These scenario questions prove you can assemble them — the format mid/senior Kafka interviews actually lean on. For each, the "what a strong answer covers" list is the rubric, not a script — practice explaining your reasoning out loud, not memorizing the bullet points.

## 1. "Design a notification system (email/SMS/push) using Kafka."

What a strong answer covers:
- One topic (or one per channel — invoke the tradeoff from Module 6's topic-design section and justify your pick) keyed by `userId` so one user's notifications stay ordered.
- Separate consumer groups per channel (email service, SMS service, push service) if using a single topic — independent fan-out (Module 2), each channel processes at its own pace.
- Producer durability: `acks=all` + `enable.idempotence=true` (Module 5) — losing a notification silently is a real user-facing failure.
- At-least-once delivery is the realistic default, so the actual "send" operation must be idempotent (Module 6) — a redelivered message shouldn't double-send.
- A DLT for permanently-failing sends (bad phone number format, etc.) with monitoring on DLT volume (Module 6/9), not just retries.
- Rate limiting/backpressure consideration if the downstream provider (SMS gateway) has its own throughput limits — `pause()`/`resume()` (Module 4) as the mechanism.

## 2. "Design an event-driven order processing pipeline for an e-commerce checkout (payment, inventory, shipping, analytics all need to react to an order)."

What a strong answer covers:
- Single `OrderPlaced` event, event-carried state transfer style (Module 0) so each consumer has what it needs without calling back to the order service.
- Independent consumer groups per downstream concern (payment, inventory, shipping, analytics) — this is the textbook pub/sub-via-consumer-groups case (Module 2).
- Ordering consideration: does inventory reservation need to happen before shipping notification for the *same* order? If so, key by `orderId` (Module 2) and be explicit about what ordering guarantee you actually need vs assume.
- Atomicity: if the order service's own DB write and the Kafka publish must not diverge, this is exactly the transactional outbox pattern discussion (Module 0/6) — bring it up unprompted, it's the "senior" signal in this question.
- Failure isolation: payment processing being slow/down must not block inventory or analytics from proceeding — this is the whole point of decoupling via a broker (Module 0), make sure your answer actually delivers that property rather than accidentally re-coupling services through synchronous calls layered on top.

## 3. "How would you guarantee exactly-once processing for a payment event, end to end?"

What a strong answer covers:
- Immediately flag that "exactly-once" needs to be scoped: Kafka's own transactional exactly-once only covers Kafka-to-Kafka (Module 2/4) — this question is really about the external side effect (charging a card, updating a ledger), which needs a different answer.
- Idempotent producer (`enable.idempotence=true`) removes producer-retry duplicates (Module 5) — necessary but not sufficient.
- The actual answer: idempotent consumer logic keyed on a stable payment/transaction id (dedupe check or a naturally idempotent operation like "mark this transaction id as settled" rather than "increment balance") — Module 6.
- If the payment write and a Kafka publish (e.g. "PaymentSettled" event) both need to happen atomically, name the outbox pattern or `ChainedKafkaTransactionManager` (Module 5/6) and correctly state which one gives a rigorous guarantee vs which is best-effort.
- Bonus point: mention that "exactly-once processing" as a user-facing property is really "effectively-once" — duplicates can still arrive, they're just rendered harmless by idempotency, not actually prevented at the transport level.

## 4. "A consumer group's lag is growing unbounded in production. Walk me through how you'd diagnose and fix it."

What a strong answer covers:
- Confirm it's real lag, not a monitoring blip — check via `AdminClient`/CLI (Module 4/9), correlate with recent deploys (rebalance-induced blips recover on their own).
- Distinguish two root causes: not enough parallelism (partition count/consumer concurrency, Module 2/5) vs. per-record processing too slow (downstream dependency, Module 9).
- If parallelism-bound: check whether concurrency is capped below partition count, or whether partition count itself is the ceiling (and know that increasing it reshuffles keys, Module 2, so it's not a free lunch).
- If processing-bound: consider a batch listener (Module 5) to amortize per-record overhead, or address the actual downstream bottleneck directly — don't just throw more consumer threads at a problem that's actually a slow database.
- Mention monitoring/alerting thresholds so this is caught before "unbounded," not just how to fix it once noticed (Module 6).

## 5. "How would you migrate a system from synchronous REST calls between services to an event-driven architecture using Kafka, without downtime?"

What a strong answer covers:
- Strangler-fig style incremental migration: introduce the event alongside the existing synchronous call first (dual-write or CDC-based, Module 0), let new consumers build confidence against real traffic before removing the synchronous path.
- CDC (Module 0) as a way to introduce events without touching the producing service's code at all, if that's lower-risk than modifying it directly.
- Backward compatibility: old synchronous callers and new event consumers coexisting means the event schema needs to be stable/versioned (Module 6's schema registry discussion) from day one, not added later once multiple consumers already depend on the shape.
- Rollback plan: what happens if the new consumer has a bug — can you replay from an earlier offset (Module 2) to reprocess once fixed, without needing the producer to resend anything?

## 6. "Your analytics ingestion pipeline (sound familiar?) needs to handle 10x its current traffic. What do you change?"

What a strong answer covers (deliberately mirrors `analytics-backend`'s actual `EventConsumer`, so this doubles as a real design review of this repo):
- Partition count and consumer concurrency scaling together (Module 2/5) — check whether 3 partitions is still enough, remembering the reshuffle-on-increase caveat.
- Batch listener + bulk Mongo writes (Module 5) instead of one `findAndModify` + one `save` per event, if per-record DB round trips are the bottleneck.
- Whether the two-write-per-event pattern (`Session` update + `Event` insert) becomes a bigger liability at higher volume — revisit the transaction/idempotency fix from Module 6 with throughput in mind, not just correctness in mind.
- Producer-side batching tuning (`linger.ms`/`batch.size`/`compression.type`, Module 5) — already reasonably set in this repo, but worth re-benchmarking at higher volume.
- Whether `replicas(1)` (currently the case in this repo) becomes untenable at higher stakes/volume — more traffic usually means more cost of data loss, raising the bar on durability decisions that were previously deferred.
