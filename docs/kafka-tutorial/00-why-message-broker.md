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
If you come from RabbitMQ/SQS, you'll instinctively look for "ack this message" / "requeue on nack" semantics. Kafka has no such thing at the message level — you only ever move an offset forward (per partition, per consumer group). There's no way to selectively "fail" one message from a batch and have Kafka retry only that one automatically; retry/DLT logic in Kafka is something *you* build in the consumer (see Module 4), not something the broker does for you.

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

## Interview questions for this module

1. **"What is Kafka and why would you use it over a REST call?"** — Answer in terms of decoupling, backpressure, and replay; don't just say "it's a message queue."
2. **"How is Kafka different from RabbitMQ?"** — Log-based, replayable, offset-tracked-by-consumer vs smart-broker, routing-rich, message-deleted-on-ack. Expect this in almost every Kafka interview.
3. **"When would you NOT use Kafka?"** — Shows you understand tradeoffs, not just the sales pitch. Mention operational overhead and cases where a simple queue suffices.
4. **"Does Kafka delete a message once it's been consumed?"** — No; a very common gotcha question to filter out surface-level knowledge.
