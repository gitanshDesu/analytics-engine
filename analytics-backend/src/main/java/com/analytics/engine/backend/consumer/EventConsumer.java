package com.analytics.engine.backend.consumer;

import com.analytics.engine.backend.dto.requests.EventRequest;
import com.analytics.engine.backend.enums.EventType;
import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Event;
import com.analytics.engine.backend.model.Session;
import com.analytics.engine.backend.repo.EventRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventConsumer {
    private final MongoTemplate mongoTemplate;
    private final EventRepo eventRepo;

    @KafkaListener(topics = "event-topic", groupId = "event-consumer-group")
    public void consume(EventRequest request){
        // TODO: Validate that trackingId exists in the database — reject unknown IDs to prevent data spoofing
        // TODO: Validate Origin/Referer header against registered domains for this trackingId to block cross-site spoofing
        log.info("consume: type={} trackingId={} sessionId={} visitorId={} pagePath={}",
                request.getEventType(), request.getTrackingId(), request.getSessionId(),
                request.getVisitorId(), request.getPagePath());

        Event newEvent = new Event();
        newEvent.setTrackingId(request.getTrackingId());
        newEvent.setVisitorId(request.getVisitorId());
        newEvent.setSessionId(request.getSessionId());
        newEvent.setEventType(request.getEventType());
        newEvent.setPagePath(request.getPagePath());
        newEvent.setEventTime(request.getEventTime());
        newEvent.setPayload(request.getPayload());
        newEvent.setPageTitle(request.getPageTitle());

        // Atomic $inc, not read-modify-write: the SDK's flushEventQueue fires several
        // /event/register calls concurrently (no await between them within a batch), so a
        // read-then-save on the session's counters would silently lose increments under
        // real traffic — eventCount/pageViews would drift below the true event count.
        Update update = new Update()
                .inc("eventCount", 1)
                .set("lastActivityAt", request.getLastActivityAt());
        if (request.getEventType() == EventType.PAGE_VIEW) {
            update.inc("pageViews", 1);
        }

        Session updatedSession = mongoTemplate.findAndModify(
                Query.query(Criteria.where("sessionId").is(request.getSessionId())
                        .and("visitorId").is(request.getVisitorId())),
                update,
                FindAndModifyOptions.options().returnNew(true),
                Session.class
        );
        if (updatedSession == null) {
            throw new ResourceNotFoundException("Session not found for sessionId=" + request.getSessionId());
        }

        eventRepo.save(newEvent);

    }
}
