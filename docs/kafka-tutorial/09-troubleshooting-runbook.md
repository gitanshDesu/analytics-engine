# Module 9 — Troubleshooting Runbook

Everything above teaches concepts one at a time. This module is the opposite shape on purpose: a symptom-first index for when something's actually broken and you need to find the cause fast, not re-derive it from first principles. Each entry cross-references the module that explains the underlying mechanism.

## "My consumer isn't getting any messages"

1. **Wrong `bootstrap-servers` / broker unreachable** — check `advertised.listeners` (Module 1) if running Kafka in Docker; confirm with the CLI producer/consumer pair from Module 1 *before* suspecting your Spring code.
2. **`auto-offset-reset=latest` and no committed offset exists** — a brand-new consumer group with `latest` only sees messages produced *after* it started; if you expect to see history, you need `earliest` (Module 2) or the messages genuinely haven't been produced since this group started.
3. **Consumer subscribed to the wrong topic name, or a typo in `group-id`/topic that silently creates a new empty topic** (if `auto.create.topics.enable=true`) — check `kafka-topics.sh --list` (Module 1) to confirm the topic you think you're consuming actually has data and matches the name in your `@KafkaListener`.
4. **All partitions assigned to a different, already-running instance** — if you're running multiple instances of the same consumer group locally for testing, remember partitions split across them (Module 2); your specific instance may legitimately own zero partitions if there are more instances than partitions.

## "Consumer lag keeps growing and never recovers"

1. **Undersized `concurrency`/partition count relative to throughput** — check whether `spring.kafka.listener.concurrency` (Module 5) is capped below the topic's partition count, or whether the topic itself has too few partitions for the required parallelism (remember: partitions can only be increased, not decreased — Module 2 — so err generous within reason).
2. **Slow per-record processing** (a slow downstream DB write, external API call) — this is a throughput problem, not a Kafka problem; consider a batch listener (Module 5) to reduce per-record overhead, or address the actual downstream bottleneck.
3. **Repeated rebalances resetting progress** — check logs for frequent "revoked/assigned partitions" — if correlated with slow processing, you're hitting `max.poll.interval.ms` (Module 2/5), not a genuine crash loop.
4. **A poison message stuck retrying** — if using blocking `DefaultErrorHandler` retries (Module 6), one bad record can stall an entire partition through its backoff window repeatedly; check whether switching to `@RetryableTopic`'s non-blocking retries (Module 6) is warranted.
5. **Measure it correctly first** — confirm you're looking at real lag (`AdminClient`/`kafka-consumer-groups.sh --describe`, Module 4) and not a monitoring artifact; lag briefly spiking right after a deploy-triggered rebalance is normal and should recover within seconds to a couple minutes.

## "I'm seeing duplicate side effects (double-counted, duplicate rows, etc.)"

1. **Non-idempotent consumer logic under at-least-once delivery** — this is expected Kafka behavior, not a bug in Kafka itself (Module 2, Module 6); the fix is always in your consumer code — dedupe by a stable message id or make the operation naturally idempotent (upsert instead of increment).
2. **Offset committed before processing finished, then a crash and reprocessing** — check your ack mode (Module 5); `AckMode.BATCH`/`RECORD` commit after your listener returns successfully, but a crash mid-processing with auto-commit-style timing can still cause reprocessing on restart — this is *why* idempotency is needed regardless of ack-mode tuning, not a substitute for it.
3. **A rebalance happened mid-batch and offsets for already-processed records weren't committed before the partition moved** — see `ConsumerRebalanceListener`/`onPartitionsRevoked` (Module 4) for the fix.

## "Messages are out of order"

1. **No key, or an inconsistent key, used for related messages** — same logical entity (session/order/user) must use the same key on every send to land in the same partition (Module 2).
2. **Partition count was increased after production traffic already existed** — this reshuffles the key→partition hash mapping (Module 2); events for the same key before vs after the resize can land in different partitions, breaking the ordering guarantee you were relying on. There's no clean fix after the fact besides accepting the gap or migrating to a new topic.
3. **`max.in.flight.requests.per.connection > 1` with `enable.idempotence=false`** — producer-side retries can reorder records within a partition (Module 5); either enable idempotence or cap in-flight requests to 1.
4. **You're comparing order across partitions or across topics** — Kafka never promises this (Module 2); if you need it, it means your key/partitioning strategy needs to change, not that something is broken.

## "A rebalance is happening constantly / consumers keep getting kicked out"

1. **Processing between `poll()` calls exceeds `max.poll.interval.ms`** — by far the most common cause (Module 2/4); check for slow downstream calls, GC pauses, or a `max.poll.records` set too high for your per-record processing time.
2. **Rolling deploys of consumer instances** — expected during deploys under the eager assignor; switch to `CooperativeStickyAssignor` (Module 2) to shrink the blast radius if deploys are frequent.
3. **Network instability causing missed heartbeats** — check `session.timeout.ms`/`heartbeat.interval.ms` (Module 5) if this is happening on an unreliable network, not just during deploys.

## "Send failures are invisible / I don't know if a message actually got published"

This is a code-review finding, not a Kafka mystery: a discarded `producer.send()`/`kafkaTemplate.send()` return value or missing callback (Module 2) means failures are silently swallowed by your own code, not by Kafka. Attach a callback or `.whenComplete()`/`.exceptionally()` handler — there is no way to retroactively recover this information after the fact if you didn't capture it at send time.

## "A message landed on the DLT and I don't know why" / "malformed messages aren't reaching the DLT at all"

1. **If business-logic exceptions reach the DLT but malformed/undeserializable messages don't** — you're missing `ErrorHandlingDeserializer` (Module 5); a plain `JsonDeserializer` failure happens too early in the pipeline for `DefaultErrorHandler` to catch on its own.
2. **Check the DLT record's exception headers** — `DeadLetterPublishingRecoverer` attaches the original exception's class/message as headers on the DLT record; read them before guessing.
3. **Nobody is consuming the DLT** — a DLT accumulating messages with no monitoring or replay tooling is silent failure with extra steps (Module 6) — treat DLT volume itself as a metric worth alerting on.

## "Topic creation/config change didn't take effect"

1. **`NewTopic` bean partition/replica count changed but the topic already existed** — Spring's `KafkaAdmin` does not retroactively alter existing topics (Module 4); use the Admin API or CLI to alter it directly, or recreate.
2. **Replication factor exceeds broker count** — topic creation fails outright; this is expected on a single-broker local cluster (Module 1/2) requesting `replicas > 1`.

## "It works locally but breaks in a multi-instance/production deployment"

Almost always one of: `replicas(1)` (Module 2 — no fault tolerance once you have more than one broker to lose), `acks`/`enable.idempotence` left unset (Module 5 — durability was never actually decided), or a local single-partition/single-instance setup masking an ordering or partition-starvation bug that only appears once you actually run multiple partitions/consumer instances for real (Module 2). Test locally with the partition count and consumer instance count you expect in production, not with defaults that happen to hide the problem.
