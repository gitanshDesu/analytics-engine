package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.requests.EventRequest;
import com.analytics.engine.backend.model.Event;
import com.analytics.engine.backend.service.EventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/event")
public class EventController {
    @Autowired
    private EventService eventService;
    private final KafkaTemplate<String, EventRequest> kafkaTemplate;

    @PostMapping("/register")
    public ResponseEntity<Void> registerEvent(@RequestBody EventRequest request) {
        log.info("POST /api/v1/event/register - trackingId={} sessionId={} visitorId={} type={}",
                request.getTrackingId(), request.getSessionId(), request.getVisitorId(), request.getEventType());
        //Todo: Add validation logic here to verify the correct event is coming
        kafkaTemplate.send("event-topic",request.getSessionId(),request);
        return new ResponseEntity<>(HttpStatus.ACCEPTED);
    }

    @PostMapping("/register/batch")
    public ResponseEntity<Void> registerEvents(@RequestBody List<EventRequest> requests) {
        log.info("POST /api/v1/event/register/batch - count={}", requests.size());
        //Todo: Add validation logic here to verify the correct event is coming
        requests.forEach(request -> kafkaTemplate.send("event-topic", request.getSessionId(), request));
        return new ResponseEntity<>(HttpStatus.ACCEPTED);
    }
}
