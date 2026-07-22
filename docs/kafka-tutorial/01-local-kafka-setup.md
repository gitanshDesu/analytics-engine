# Module 1 — Running a Local Kafka Cluster

Everything from Module 2 onward assumes a broker at `localhost:9092`. This module gets you there — two ways to run the same single-node, KRaft-mode (no ZooKeeper) broker: a `docker-compose.yml` for everyday use, and an equivalent single `docker run` for when you just want something up in one command with nothing to check into the repo.

## Option A — `docker-compose.yml` (recommended for repeated use)

```yaml
services:
  kafka:
    image: apache/kafka:4.0.0
    container_name: kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      CLUSTER_ID: "ciWo7IWazngRchmPES6q5A=="
```

```bash
docker compose up -d
docker compose logs -f kafka   # watch it come up; ctrl-C to stop tailing (container keeps running)
```

## Option B — a single `docker run` (no compose file, quick throwaway)

Same image, same environment variables, flattened into one command:

```bash
docker run -d --name kafka \
  -p 9092:9092 \
  -e KAFKA_NODE_ID=1 \
  -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@kafka:9093 \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 \
  -e CLUSTER_ID="ciWo7IWazngRchmPES6q5A==" \
  apache/kafka:4.0.0

# tear down when done:
docker stop kafka && docker rm kafka
```

Both give you the exact same single-broker, KRaft-mode cluster reachable at `localhost:9092` from your Spring Boot app (matching `spring.kafka.bootstrap-servers=localhost:9092` from Module 5) and from CLI tools on your host. Use the compose file if you'll restart this often (docs-as-config, easy to tweak); use the bare `docker run` if you just want it running right now and don't care about repeatability.

## The gotcha that wastes more beginner-hours than anything else: `advertised.listeners`

`KAFKA_LISTENERS` is what the broker binds to *inside* its own network namespace (the container). `KAFKA_ADVERTISED_LISTENERS` is what the broker tells clients to connect to — and that's the value that actually matters for anything outside the container.

Get this wrong (e.g. leave it as `PLAINTEXT://kafka:9092`, the container's own hostname) and you'll see something like:

- The client connects to `localhost:9092` for the *initial* bootstrap request fine (since you published that port)...
- ...but the bootstrap response tells the client "the partition leader is at `kafka:9092`"...
- ...and your host machine can't resolve `kafka` as a hostname (that only resolves *inside* the Docker network) — so every produce/fetch after the initial connection hangs or times out, even though the broker looks "up."

This is why the config above explicitly sets `KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092` — matching what your *host-side* Spring Boot app and CLI tools will actually use to reach it. If you later run your Spring Boot app **inside** the same Docker network (e.g. in its own container, common in a docker-compose setup that includes your app too), you'd instead advertise the broker's container hostname (e.g. `PLAINTEXT://kafka:9092`) for other containers, and you'd need a **second, separate listener** advertised differently for host access — this is what the two-listener pattern (`PLAINTEXT` for one audience, `PLAINTEXT_HOST` for another, each with its own advertised address) solves in more complex compose files. For this tutorial (Spring Boot running on your host, broker in Docker), the single-listener setup above is enough.

**Gotcha:** if you change `CLUSTER_ID` or any of the controller-quorum settings after the broker has already started once and written data to its volume, it can refuse to start on the next `docker compose up` (KRaft's metadata log disagrees with the new config). If you hit this while experimenting, the fastest fix for a throwaway dev cluster is `docker compose down -v` (removes the container's volume) and start fresh — never do this against anything with data you care about.

## Verifying it's actually working

With the container running, use the broker's own CLI tools (available inside the container) to sanity-check before you write a single line of Spring code:

```bash
# Create a topic
docker exec kafka /opt/kafka/bin/kafka-topics.sh --create \
  --topic smoke-test --partitions 3 --replication-factor 1 \
  --bootstrap-server localhost:9092

# List topics — confirms the broker is up and the topic exists
docker exec kafka /opt/kafka/bin/kafka-topics.sh --list \
  --bootstrap-server localhost:9092

# Describe it — confirms partition count/replication landed as expected
docker exec kafka /opt/kafka/bin/kafka-topics.sh --describe \
  --topic smoke-test --bootstrap-server localhost:9092
```

Produce and consume from two separate terminals to confirm end-to-end delivery, independent of any Java code:

```bash
# terminal 1 — producer, type messages and hit enter to send each
docker exec -it kafka /opt/kafka/bin/kafka-console-producer.sh \
  --topic smoke-test --bootstrap-server localhost:9092

# terminal 2 — consumer, should print whatever you typed above
docker exec -it kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --topic smoke-test --from-beginning --bootstrap-server localhost:9092
```

If both of these work, your Spring Boot app's `spring.kafka.bootstrap-servers=localhost:9092` will work too — any connection problem past this point is in your application config, not the broker.

## Gotchas to remember from this module

1. **`advertised.listeners` is the #1 local-Kafka connectivity bug** — see above. If your Spring app can bootstrap-connect but every actual produce/consume hangs, this is almost always the cause.
2. **Port `9092` must actually be free on your host** — a leftover Kafka/other process already bound to it fails the container start silently in some Docker setups; check with `lsof -i :9092` (or `netstat`) if `docker compose up` reports the container immediately exiting.
3. **`auto.create.topics.enable`** defaults to `true` on this image — fine for this tutorial's exploration, but remember from Module 2 that production clusters usually disable it, so always explicitly create topics (`NewTopic` beans, or the CLI above) rather than relying on auto-creation, even here.
4. **Data lives in the container's writable layer/volume**, not on your host, unless you mount one — `docker compose down` (without `-v`) keeps it across restarts; `docker rm`/`down -v` wipes it. For this tutorial's throwaway experiments that's fine; don't assume it for anything you'd mind losing.

## Interview questions for this module

1. **"Your Spring Boot app can connect to Kafka running in Docker but hangs on every produce/consume — what's the first thing you check?"** — `advertised.listeners`; the bootstrap connection succeeds but the broker is telling the client to reconnect to an address the client can't resolve/reach.
2. **"What's the difference between `listeners` and `advertised.listeners`?"** — What the broker binds to internally vs what it tells clients to use — they can legitimately differ (this is exactly how you serve both in-network and host clients from the same broker with two listener names).
3. **"How would you verify a Kafka broker is healthy without writing any application code?"** — CLI tools: `kafka-topics.sh --list`, and an end-to-end console producer/consumer pair.
