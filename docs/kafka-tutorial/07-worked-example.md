# Module 7 — Worked Example: Order Placed Events

Assumes a broker running per Module 1 at `localhost:9092`. A small, disposable example — separate from `analytics-backend` — so mistakes here are cheap. Scenario: an `OrderPlacedEvent { orderId, customerId, amount }`, keyed by `customerId` so one customer's orders stay ordered.

## Step 1 — Raw `kafka-clients`, no Spring

Seeing the unwrapped client first demystifies what `KafkaTemplate`/`@KafkaListener` do for you.

**Producer:**

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName()); // raw JSON string, kept simple here
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
    String key = "customer-42";
    String value = "{\"orderId\":\"o-1\",\"customerId\":\"customer-42\",\"amount\":19.99}";
    ProducerRecord<String, String> record = new ProducerRecord<>("orders", key, value);

    producer.send(record, (metadata, exception) -> {
        if (exception != null) {
            System.err.println("send failed: " + exception.getMessage());
        } else {
            System.out.printf("sent to partition=%d offset=%d%n", metadata.partition(), metadata.offset());
        }
    });
    producer.flush(); // force the batch out before the try-with-resources closes the producer
}
```

**Consumer:**

```java
Properties props = new Properties();
props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-consumer-group");
props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false); // commit manually, after processing succeeds

try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
    consumer.subscribe(List.of("orders"));
    while (true) {
        ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(500));
        for (ConsumerRecord<String, String> record : records) {
            System.out.printf("received key=%s value=%s partition=%d offset=%d%n",
                record.key(), record.value(), record.partition(), record.offset());
        }
        if (!records.isEmpty()) {
            consumer.commitSync(); // only commit after the loop body above has run for every record
        }
    }
}
```

Run the producer once, then the consumer — notice the consumer gets the message even though it started after the producer sent it (because `auto-offset-reset=earliest` and no committed offset exists yet for this new group).

## Step 2 — The same thing in Spring Boot

**`build.gradle` dependency:** `implementation 'org.springframework.boot:spring-boot-starter-kafka'` (or `spring-kafka` directly on older Boot versions).

**DTO:**

```java
public record OrderPlacedEvent(String orderId, String customerId, BigDecimal amount) {}
```

**Topic bean:**

```java
@Bean
public NewTopic ordersTopic() {
    return TopicBuilder.name("orders").partitions(3).replicas(1).build();
}
```

**`application.properties`:**

```properties
spring.kafka.bootstrap-servers=localhost:9092

spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.springframework.kafka.support.serializer.JsonSerializer
spring.kafka.producer.properties.acks=all
spring.kafka.producer.properties.enable.idempotence=true

spring.kafka.consumer.group-id=order-consumer-group
spring.kafka.consumer.auto-offset-reset=earliest
spring.kafka.consumer.key-deserializer=org.apache.kafka.common.serialization.StringDeserializer
spring.kafka.consumer.value-deserializer=org.springframework.kafka.support.serializer.ErrorHandlingDeserializer
spring.kafka.consumer.properties.spring.deserializer.value.delegate.class=org.springframework.kafka.support.serializer.JsonDeserializer
spring.kafka.consumer.properties.spring.json.trusted.packages=com.example.orders.dto
spring.kafka.listener.ack-mode=manual_immediate
```

Note the `value-deserializer` here is `ErrorHandlingDeserializer`, not `JsonDeserializer` directly, with the real deserializer pushed into `spring.deserializer.value.delegate.class`. This is what makes Step 3's DLT demo actually work — see Module 5's "Deserialization error handling" section for why a plain `JsonDeserializer` plus an error-handler bean alone isn't sufficient for deserialization failures specifically (as opposed to failures thrown by your listener method's business logic, which the plain setup does handle fine).

**Producer (a REST controller):**

```java
@RestController
@RequiredArgsConstructor
public class OrderController {
    private final KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate;

    @PostMapping("/orders")
    public ResponseEntity<Void> placeOrder(@RequestBody OrderPlacedEvent event) {
        kafkaTemplate.send("orders", event.customerId(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("failed to publish order {}", event.orderId(), ex);
                }
            });
        return ResponseEntity.accepted().build();
    }
}
```

**Consumer:**

```java
@Component
@Slf4j
public class OrderConsumer {

    @KafkaListener(topics = "orders", groupId = "order-consumer-group")
    public void consume(OrderPlacedEvent event, Acknowledgment ack) {
        log.info("processing order {}", event.orderId());
        // ... business logic ...
        ack.acknowledge(); // only commits because ack-mode=manual_immediate above
    }
}
```

Compare this to Step 1: `KafkaTemplate.send()` replaces the manual `KafkaProducer` + try-with-resources; `@KafkaListener` replaces the manual `poll()` loop, and `Acknowledgment.acknowledge()` is the Spring-idiomatic equivalent of the raw `consumer.commitSync()` call — same underlying mechanics, Spring just manages the loop and thread pool (`concurrency`) for you.

## Step 3 — Break it, then fix it with a DLT

**Break it deliberately:** send a malformed payload directly with a raw producer (bypassing the controller's validation), e.g. publish the literal string `not valid json` to the `orders` topic. Without the `ErrorHandlingDeserializer` wrapping shown above, this either repeatedly fails the same `poll()` call (parking on that offset, blocking the partition) or crashes the container, depending on client version — it does **not** cleanly reach a per-record error handler the way a business-logic exception thrown inside your listener method would. With the wrapping in place, the bad bytes surface as a `DeserializationException` your error handler *can* see; without it, the failure happens too early in the pipeline for `DefaultErrorHandler` to help at all.

**Fix it — add a DLT-publishing error handler:**

```java
@Bean
public DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<Object, Object> template) {
    var recoverer = new DeadLetterPublishingRecoverer(template);
    var backOff = new FixedBackOff(1000L, 3); // 3 retries, 1s apart
    return new DefaultErrorHandler(recoverer, backOff);
}
```

Re-run the same broken-payload send. This time, because `ErrorHandlingDeserializer` (already configured above) converts the failure into a `DeserializationException` the container's error handling can act on: 3 retries (with a 1s pause each), then the raw bytes + exception headers land on `orders.DLT` instead of vanishing. Consume `orders.DLT` with a throwaway consumer (or the CLI: `kafka-console-consumer --topic orders.DLT --from-beginning`) and see the failed payload sitting there, inspectable.

This is the "aha" moment worth doing hands-on rather than just reading about: the exact same failure produces two very different outcomes (silent loss vs a durable, inspectable record) depending on whether the error handler bean exists.

## What to try next

Once this example works end to end, go straight to Module 8's task — it's the same shape of system (REST endpoint → producer → consumer) but with the hardening requirements (idempotence, DLT, idempotent consumer, a test) you now have to wire up yourself rather than copy from this walkthrough.
