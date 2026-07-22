# Module 3 — Spring Boot + Spring Kafka: Full Configuration Walkthrough

This module is reference material — read it once end to end, then come back to specific rows as you configure your own topics. Every row is annotated against the actual `analytics-backend` code where relevant, so you can see what's explicit vs implicitly defaulted.

Your current config, for reference (`analytics-backend/src/main/resources/application.properties`):

```properties
spring.kafka.bootstrap-servers=localhost:9092

spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.springframework.kafka.support.serializer.JsonSerializer
spring.kafka.producer.properties.linger.ms=20
spring.kafka.producer.properties.batch.size=32768
spring.kafka.producer.properties.compression.type=snappy

spring.kafka.consumer.group-id=event-consumer-group
spring.kafka.consumer.auto-offset-reset=earliest
spring.kafka.consumer.key-deserializer=org.apache.kafka.common.serialization.StringDeserializer
spring.kafka.consumer.value-deserializer=org.springframework.kafka.support.serializer.JsonDeserializer
spring.kafka.consumer.properties.spring.json.trusted.packages=*
spring.kafka.listener.concurrency=3
```

And the topic bean (`config/KafkaTopicConfig.java`):

```java
@Bean
public NewTopic eventTopic() {
    return TopicBuilder.name("event-topic").partitions(3).replicas(1).build();
}
```

## Connection

| Property | Controls | Notes |
|---|---|---|
| `spring.kafka.bootstrap-servers` | Initial broker(s) the client contacts to discover the full cluster | Set to `localhost:9092` — fine for local dev; in prod list 2-3 brokers, not one, so startup survives one being down |

## Producer properties

| Property | Controls | At each extreme | Recommendation |
|---|---|---|---|
| `key-serializer` / `value-serializer` | How key/value objects become bytes | N/A — must match what the consumer deserializes | `StringSerializer` + `JsonSerializer` is a reasonable default for a service you fully control end to end (see schema evolution caveat in Module 4) |
| `acks` | Durability: how many replicas must confirm before the send is considered successful | `0`: fire-and-forget, fastest, can silently lose data on broker failure. `1`: leader only, can lose data if leader dies before followers replicate. `all`/`-1`: leader + all in-sync replicas (governed by `min.insync.replicas`), safest, slightly higher latency | **Not currently set** in your config (defaults to `1` on modern clients) — for an analytics event pipeline where occasional loss might be tolerable, `acks=1` may be a deliberate choice, but it should be a *chosen* value, not a silent default. If you care about not losing events, set `acks=all`. |
| `retries` | How many times the producer retries a failed send internally, before giving up | `0`: any transient blip drops the message. High: producer keeps trying, but see ordering caveat below | Default is already very high (effectively `Integer.MAX_VALUE` bounded by `delivery.timeout.ms`) on modern clients — usually leave alone, but understand it's bounded by `delivery.timeout.ms`, not infinite |
| `retry.backoff.ms` | Wait between retries | Too low: hammers a struggling broker. Too high: slow recovery | Default (100ms) is fine for most cases |
| `enable.idempotence` | Prevents the *producer's own retries* from creating duplicate records at the broker level (assigns sequence numbers per partition) | Off (older default): a retried send after an ambiguous timeout can create a duplicate. On: broker dedupes based on producer id + sequence number | **Not currently set.** Recommended `true` if you set `acks=all` — pairing them gives you "exactly once from this producer to this partition," which removes one whole class of duplicate (producer-retry duplicates); it does **not** remove duplicates from consumer-side reprocessing (a separate concern, Module 4) |
| `delivery.timeout.ms` | Upper bound on total time from `send()` call to success/failure, encompassing request timeout + retries + backoff | Too short: gives up before a legitimate retry could succeed. Too long: a `send()` future can stay unresolved a long time under broker trouble | Default (120s) is a sane starting point |
| `max.in.flight.requests.per.connection` | How many unacknowledged requests can be in flight to a broker at once | Higher: more throughput, but **if `enable.idempotence=false` and this is > 1, retries can reorder records** within a partition. With idempotence **on**, Kafka guarantees order even with this > 1 (up to 5) | Default is 5, which is safe *with idempotence on* (the common recommended pairing: `acks=all` + `enable.idempotence=true`) |
| `linger.ms` | How long the producer waits to accumulate a bigger batch before sending, per partition | `0`: send immediately, lowest latency, worst batching. High: better throughput/compression, added latency per message | You already set `20`ms — reasonable middle ground for an ingestion pipeline that doesn't need sub-millisecond latency |
| `batch.size` | Max bytes per batch (per partition) before sending regardless of `linger.ms` | Too small: batching barely happens even with linger.ms set. Too large: batches rarely fill, so `linger.ms` becomes the effective trigger, and memory use per partition rises | You already set `32768` (32KB) — a reasonable value; note this is bytes, not record count |
| `compression.type` | Compresses batches before sending (none/gzip/snappy/lz4/zstd) | `none`: no CPU cost, more network/disk. `gzip`: best compression ratio, most CPU. `snappy`/`lz4`: fast, moderate ratio. `zstd`: best balance of ratio and speed on modern hardware | You use `snappy` — good default; `zstd` is worth benchmarking if network/disk becomes the bottleneck, it usually compresses better at similar CPU cost on modern client versions |
| `buffer.memory` | Total memory the producer uses to buffer records awaiting send | Too small under high throughput: `send()` blocks or throws `BufferExhaustedException` | Default (32MB) is fine unless you have very high throughput or very large messages |

## Consumer properties

| Property | Controls | At each extreme | Recommendation |
|---|---|---|---|
| `group-id` | Which consumer group this instance joins | N/A | `event-consumer-group` — fine; remember offsets are tracked per group, so renaming this later effectively resets progress (new group starts per `auto-offset-reset`) |
| `auto-offset-reset` | What to do when there's no committed offset yet for a partition (new group, or offset expired) | `earliest`: read from the very beginning of the topic. `latest`: only new messages from now on. `none`: throw an exception instead | You use `earliest` — sensible for a group that should not miss historical events on first deploy, but be aware a brand-new deploy of a *renamed* group will reprocess the entire retained history |
| `key-deserializer` / `value-deserializer` | Inverse of the producer serializers | Must match producer's serialization format | `StringDeserializer` + `JsonDeserializer` — matches your producer |
| `spring.json.trusted.packages` | Allowlist of Java packages `JsonDeserializer` is permitted to instantiate into | `*`: trusts everything — **deserialization gadget risk** if any malicious/unexpected payload reaches the topic. Scoped: only your DTO package(s) can be deserialized | **Currently `*` — should be scoped**, e.g. `com.analytics.engine.backend.dto.requests`. This matters more once anything outside your own services can produce to this topic, but is cheap to fix now regardless. |
| `enable-auto-commit` (+ `auto.commit.interval.ms`) | Whether the container commits offsets automatically on a timer, vs only when you tell it to | Auto-commit: simplest, but commits can happen *before* your processing logic actually finishes or succeeds — meaning a crash mid-processing can lose track of an unprocessed-but-committed message (or, depending on interval timing, cause reprocessing) | **Not explicitly set in your config** — Spring Kafka's default listener container uses **`AckMode.BATCH`** (commit after the container-managed batch of records is successfully processed by your listener method), which is *not* the same as Kafka's raw `enable.auto.commit=true`. This is a subtlety worth internalizing: Spring's container-level ack mode is the thing actually governing your offset-commit safety, not the raw Kafka auto-commit flag. See "Ack mode" below — this is the single most consequential row in this whole table for your `EventConsumer`'s correctness. |
| `max.poll.records` | Max records returned per `poll()` call | Too high: one batch takes long to process, risks exceeding `max.poll.interval.ms`. Too low: more overhead, less batching benefit | **Not set** (default 500) — fine unless your per-record processing (Mongo writes) is slow enough that 500 records routinely blows past your poll interval |
| `max.poll.interval.ms` | Max time allowed between `poll()` calls before the consumer is presumed dead and evicted from the group | Too short: legitimate slow processing triggers spurious rebalances. Too long: a genuinely stuck consumer holds its partition for a long time before Kafka notices | Default (5 min) is generous; revisit only if you see unexplained rebalances correlating with slow Mongo writes |
| `session.timeout.ms` / `heartbeat.interval.ms` | Liveness detection between heartbeats (separate from the poll-interval mechanism above — this detects a truly dead/unresponsive process, not just slow processing) | Too short: flaky networks cause false-positive "dead consumer" evictions. Too long: slow to detect a genuinely dead consumer | Defaults are reasonable; rarely need tuning unless on an unstable network |
| `fetch.min.bytes` / `fetch.max.wait.ms` | Server-side batching for the consumer's fetch requests — broker waits until either enough bytes accumulate or the wait time elapses before responding | Higher `fetch.min.bytes`: fewer, bigger fetches (more throughput, more latency per fetch). Low: more, smaller fetches (lower latency, more request overhead) | Defaults are fine for most workloads; tune only under proven throughput bottlenecks |
| `isolation.level` | Whether the consumer sees uncommitted transactional records (`read_uncommitted`, default) or waits for transaction commit (`read_committed`) | Only relevant if producers use Kafka transactions | Not relevant to your current setup (no transactional producer in play) — revisit if you adopt Kafka transactions (Module 4) |

## Listener container (the Spring-specific layer on top of the raw consumer)

| Property | Controls | Notes |
|---|---|---|
| `spring.kafka.listener.concurrency` | Number of consumer threads Spring spins up *per `@KafkaListener` method*, each an independent `KafkaConsumer` in the same group | **Capped by partition count** — you set `concurrency=3` and `partitions(3)` on `event-topic`, which is exactly matched (good). Setting concurrency higher than partition count wastes threads that will sit idle; setting it lower under-utilizes available partitions. |
| `ackMode` (`RECORD` / `BATCH` / `MANUAL` / `MANUAL_IMMEDIATE` / `COUNT` / `TIME`) | When the container commits the offset relative to your listener method running | `RECORD`: commit after every single record — safest, slowest. `BATCH` (default): commit after each poll's batch of records is processed by your listener — the current implicit setting for `EventConsumer`. `MANUAL`/`MANUAL_IMMEDIATE`: your code explicitly calls `Acknowledgment.acknowledge()` — required once you want to defer/skip commits around error handling (e.g. don't commit until *after* a successful DLT publish on failure). | This is the lever to change **first** when fixing the "offset commits even though the Mongo write threw" problem from the code review — moving to `MANUAL`/`MANUAL_IMMEDIATE` combined with a `DefaultErrorHandler` (Module 4) is the standard fix. |

## Topic provisioning

| Property | Controls | Notes |
|---|---|---|
| `NewTopic.partitions()` | Partition count at creation time | `3` in your config — matches listener concurrency (good pairing). Remember: can only be increased later, never decreased, and increasing reshuffles key→partition mapping (Module 1). |
| `NewTopic.replicas()` | Replication factor at creation time | `1` in your config — **zero fault tolerance**; fine for a single-broker local Kafka, but this value can't legally exceed your broker count, and must be raised (typically `3`) before any real multi-broker/production deployment. |
| (not present) `min.insync.replicas` | Minimum replicas (including leader) that must ack for an `acks=all` write to succeed | Not configured — moot right now since `replicas=1` means there's nothing to require beyond the leader anyway. Becomes relevant the moment you raise replication factor. |

## Comparison — where should config values live?

| Approach | Pros | Cons | When to use |
|---|---|---|---|
| `application.properties` (your current approach) | Simple, visible in one file, standard Spring convention | No compile-time type safety, easy to typo a property name silently (Spring just won't apply it) | Small-to-medium services, single environment profile |
| `application-{profile}.properties` per environment | Different tuning per env (e.g. lower `replicas` in dev, `3` in prod) | More files to keep in sync | As soon as you have distinct dev/staging/prod Kafka clusters — worth adding once you deploy beyond local |
| Programmatic `ProducerFactory`/`ConsumerFactory` beans | Full control, can compute values, easier to unit test config logic itself | More boilerplate, easy to accidentally override Spring Boot's autoconfiguration in surprising ways | When you need per-topic differing configuration within the same service (e.g. one high-throughput topic and one low-latency topic with different `linger.ms`) |

Your project currently has **no `application-{profile}.properties`** — worth adding once you have a real staging/prod Kafka cluster, specifically to raise `replicas` and set `acks=all` there while keeping local dev permissive/simple.

## Gotchas to remember from this whole module

1. Spring's container-level **ack mode** (default `BATCH`) — not the raw `enable.auto.commit` flag — is what actually governs when your offset commits relative to your `EventConsumer.consume()` logic finishing. This is the config-level root of the "silent event drop" issue found in the code review.
2. `replicas(1)` is a dev-only value; don't forget to raise it (and set `min.insync.replicas`) before any real deployment.
3. `spring.json.trusted.packages=*` should be scoped to your DTO package.
4. `concurrency` should never exceed partition count.
5. `acks` and `enable.idempotence` are unset — decide on a value deliberately rather than accepting silent client defaults, especially given you're using `sessionId` as key specifically to get ordering guarantees per session; ordering-under-retry only holds with idempotence on (or `max.in.flight.requests.per.connection=1`).

## Interview questions for this module

1. **"What's the difference between Kafka's raw `enable.auto.commit` and Spring Kafka's `AckMode`?"** — Spring's container ack mode governs commit timing relative to listener method completion (`RECORD`/`BATCH`/`MANUAL`/etc.); it doesn't just delegate to the raw client's auto-commit flag by default.
2. **"What does `acks=all` actually guarantee, and what doesn't it guarantee?"** — Guarantees all in-sync replicas confirmed the write; doesn't by itself prevent duplicates (need idempotence) or guarantee the *consumer's* processing is exactly-once.
3. **"Why pair `enable.idempotence=true` with `acks=all`?"** — Idempotence needs the strongest ack guarantee to be meaningful; together they give producer-to-partition exactly-once semantics for the write itself.
4. **"If listener concurrency is 5 but the topic has 3 partitions, what happens?"** — 2 of the 5 consumer threads sit permanently idle; only 3 can hold a partition at once.
5. **"Why can't you just decrease a topic's partition count?"** — Kafka doesn't support partition removal/log merging; you'd have to create a new topic and migrate.
6. **"What's the risk of `spring.json.trusted.packages=*`?"** — Trusts any class on the classpath for deserialization from a JSON type header, a known deserialization-gadget attack surface if an untrusted producer can reach the topic.
