# Module 0 — Why a Message Broker At All

## The problem: synchronous coupling

Imagine a checkout service that, on every order, must: charge the card, update inventory, send a confirmation email, notify the warehouse, and update analytics. Written synchronously:

```
POST /checkout
  -> chargeCard()        (200ms, can fail)
  -> updateInventory()   (150ms, can fail)
  -> sendEmail()         (800ms, can fail, often slow/flaky)
  -> notifyWarehouse()   (300ms, can fail)
  -> updateAnalytics()   (100ms, can fail)
= 1.5s+ per request, and a failure in email sending fails the entire checkout
```

Problems this creates:
- **Latency stacks up** — the caller waits for the slowest, least-relevant step (email) before getting a response.
- **Cascading failure** — if the email provider is down, checkout itself fails, even though charging the card and updating inventory succeeded.
- **Tight coupling** — checkout's code must know about every downstream consumer. Adding a 6th consumer means modifying and redeploying checkout.
- **No buffering** — a traffic spike that downstream services can't keep up with just fails requests instead of queueing them for later.

## What a broker gives you

Put a broker in the middle: checkout publishes one `OrderPlaced` event and returns immediately. Card charging, inventory, email, warehouse, and analytics each subscribe independently and process at their own pace.

- **Decoupling** — checkout doesn't know or care who's listening; new consumers can be added with zero change to the producer.
- **Backpressure absorption** — a slow consumer doesn't slow down the producer; the broker holds the backlog.
- **Independent failure domains** — email being down doesn't fail checkout; email just falls behind and catches up later.
- **Replay** — (Kafka-specific, see below) a new consumer, or one recovering from a bug, can re-read history instead of only seeing new events.

## Three shapes of "broker," and why they're not interchangeable

| Model | Example | Delivery | Once consumed | Multiple independent subscribers of full history? |
|---|---|---|---|---|
| Point-to-point queue | RabbitMQ (queue), SQS | One consumer instance gets each message | Message deleted after ack | No — a message is claimed once, then gone |
| Publish-subscribe (topic/exchange) | RabbitMQ (fanout exchange), SNS | Every subscriber gets a copy | Deleted after all deliver (or per-subscriber queue) | Yes, but no replay of old messages after subscribing |
| Durable log (Kafka) | Kafka | Every consumer group gets a copy; consumers pull at their own offset | Retained per policy (time/size), *not* deleted on read | Yes — plus late subscribers can replay from the start |

This is the distinction beginners conflate most: **Kafka does not delete a message when it's consumed.** A message sits in the partition log until retention expires it, regardless of how many consumers have read it or how many times. Consuming is just moving *your* offset pointer forward — it never mutates the log.

### Gotcha
If you come from RabbitMQ/SQS, you'll instinctively look for "ack this message" / "requeue on nack" semantics. Kafka has no such thing at the message level — you only ever move an offset forward (per partition, per consumer group). There's no way to selectively "fail" one message from a batch and have Kafka retry only that one automatically; retry/DLT logic in Kafka is something *you* build in the consumer (see Module 6), not something the broker does for you.

## Kafka vs the alternatives — comparison

| | Kafka | RabbitMQ | AWS SQS | Plain HTTP webhooks |
|---|---|---|---|---|
| Model | Durable, replayable log | Smart broker, queues/exchanges | Managed point-to-point queue | No broker — direct call |
| Ordering | Per-partition (per-key) | Per-queue (with caveats under multiple consumers) | FIFO queues only, capped throughput | Whatever the caller's retry logic does |
| Replay history | Yes (retention window) | No (once acked, gone) | No | No |
| Throughput | Very high (millions/s across a cluster) | High, but lower than Kafka at extreme scale | Moderate, per-queue throughput limits | Bound by the receiver's capacity, no buffering |
| Routing logic (headers/content-based routing) | Minimal (consumer decides) | Rich (exchanges, routing keys) | Minimal | N/A |
| Operational complexity | Higher (partitions, replication, consumer group tuning) | Moderate | Low (fully managed) | Lowest |
| Best for | Event streams, analytics pipelines, multiple independent consumers, audit/replay needs | Task queues, RPC-style work distribution, complex routing | Simple decoupled task queues in AWS-native stacks | Low volume, simple, tolerant of tight coupling |

### When to reach for Kafka
- Multiple services independently need the same event (order placed → billing, shipping, analytics, all reading the same stream)
- You need to reprocess history (a new service joins next month and needs the last 30 days of events; a bug in a consumer requires replaying from an earlier offset)
- Throughput is high and you want batching/partition-level parallelism
- Ordering matters *per entity* (per user, per session, per order) but not globally

### When Kafka is overkill
- A single producer, single consumer, simple background job queue with no replay need — RabbitMQ or SQS is simpler to run and reason about
- Low message volume where operational overhead (running/monitoring a cluster, or paying for a managed one) outweighs the benefit
- You need strict, global (not per-key) FIFO ordering across the entire topic — Kafka only orders within a partition; a single-partition topic gives you global order but throws away parallelism
- You need synchronous request/reply — Kafka is fundamentally async; layering request/reply on top (reply-to topics + correlation ids) is possible but is fighting the tool

## Event streaming: a distinct paradigm, not just "a faster queue"

Everything above frames Kafka as a message broker with better properties than a queue. That's true but incomplete — Kafka is also the base for a different way of architecting systems entirely: **event streaming**, where the log itself is treated as a durable record of everything that happened, not just a transport mechanism to get a message from A to B.

**Three ways an event can carry information, and why the distinction matters:**

| Style | What's in the event | Example | Consumer needs to... |
|---|---|---|---|
| Event notification | Just enough to say "something happened" (often just an id) | `{ orderId: "o-1" }` | Call back to the source service to get details |
| Event-carried state transfer | The full relevant state at the time of the event | `{ orderId: "o-1", customerId, items, total, status }` | Nothing else — everything needed is in the event |
| Event sourcing | The event *is* the source of truth; current state is derived by replaying all events for an entity | A sequence of `OrderCreated`, `ItemAdded`, `OrderPaid`, `OrderShipped` events, no separate "orders" table at all | Replay/fold the event history to reconstruct state |

Your `EventConsumer`/`Event` model is closest to event-carried state transfer — each `Event` document carries enough (`eventType`, `payload`, `pagePath`, etc.) that nothing needs to be fetched back from the frontend to make sense of it. Recognizing which style you're using (often implicitly) matters because it determines coupling: notification-style events keep payloads small but re-couple consumers back to the producer's API; state-transfer events decouple fully but risk staleness if the embedded state doesn't include everything a later consumer turns out to need.

**CQRS (Command Query Responsibility Segregation)** is the architectural pattern this often pairs with: writes go through one model (commands, producing events), reads are served from a separately-optimized model built by consuming those events — e.g. your `Session`/`Event` collections being the "write side," with a future analytics dashboard reading from a purpose-built aggregate collection kept up to date by a Kafka consumer, rather than querying the write-side collections directly under load.

**Change Data Capture (CDC)** is the event-streaming pattern for turning an existing database's changes into a stream without touching application code — a tool like Debezium tails a database's transaction log (MySQL binlog, Postgres WAL, Mongo oplog) and publishes each row-level change as a Kafka event. This is the standard way to bridge "a system that wasn't built with Kafka in mind" into an event-streaming architecture, and it's also the usual implementation mechanism behind the transactional outbox pattern (Module 6) — the outbox table is written normally, and CDC is what actually gets outbox rows into Kafka without a custom relay process.

**The mental shift, in one sentence:** a message queue asks "how do I get this message from A to B reliably," while event streaming asks "what is the durable, replayable history of everything that happened in this system, and what can be built by reading that history" — Kafka Streams/ksqlDB (Module 4) exist specifically to let you build materialized views and derived state *from* that history, which is a fundamentally different mental model than "process a message and discard it."

### Gotcha
Don't over-apply event sourcing everywhere just because Kafka makes it possible — replaying an entire event history to reconstruct current state is powerful but adds real complexity (schema evolution across years of historical events, snapshotting for performance, harder ad-hoc querying). Most systems, including this one, get most of the benefit from plain event-carried-state-transfer messages plus a normal database for current state — reach for full event sourcing only when audit/replay of *why* state changed (not just *what* it is now) is a real requirement.

## Interview questions for this module

1. **"What is Kafka and why would you use it over a REST call?"** — Answer in terms of decoupling, backpressure, and replay; don't just say "it's a message queue."
2. **"How is Kafka different from RabbitMQ?"** — Log-based, replayable, offset-tracked-by-consumer vs smart-broker, routing-rich, message-deleted-on-ack. Expect this in almost every Kafka interview.
3. **"When would you NOT use Kafka?"** — Shows you understand tradeoffs, not just the sales pitch. Mention operational overhead and cases where a simple queue suffices.
4. **"Does Kafka delete a message once it's been consumed?"** — No; a very common gotcha question to filter out surface-level knowledge.
5. **"What's the difference between event notification, event-carried state transfer, and event sourcing?"** — How much information rides in the event itself, ranging from "just an id" to "full state" to "the event is the only source of truth, state is derived by replay."
6. **"What's CQRS and how does it relate to Kafka?"** — Separate write and read models; Kafka is the common mechanism for keeping a read-optimized model in sync with the write model's events.
7. **"What's Change Data Capture and why would you use it instead of writing to Kafka directly in application code?"** — Tails a database's transaction log (Debezium-style) to turn existing writes into a Kafka stream with zero application code changes; also the usual engine behind the transactional outbox pattern.
