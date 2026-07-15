package com.analytics.engine.backend.service;

import com.analytics.engine.backend.dto.requests.EventRequest;
import com.analytics.engine.backend.enums.EventType;
import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Event;
import com.analytics.engine.backend.model.Session;
import com.analytics.engine.backend.repo.EventRepo;
import com.analytics.engine.backend.repo.SessionRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EventService {

    @Autowired
    private EventRepo eventRepo;

    @Autowired
    private SessionRepo sessionRepo;

    public Event createEvent(EventRequest request) {
        // TODO: Validate that trackingId exists in the database — reject unknown IDs to prevent data spoofing
        // TODO: Validate Origin/Referer header against registered domains for this trackingId to block cross-site spoofing

        Session session = sessionRepo.findBySessionIdAndVisitorId(request.getSessionId(), request.getVisitorId())
                .orElseThrow(() -> new ResourceNotFoundException("Session not found for sessionId=" + request.getSessionId()));

        Event newEvent = new Event();
        newEvent.setTrackingId(request.getTrackingId());
        newEvent.setVisitorId(request.getVisitorId());
        newEvent.setSessionId(request.getSessionId());
        newEvent.setEventType(request.getEventType());
        newEvent.setPagePath(request.getPagePath());
        newEvent.setEventTime(request.getEventTime());
        newEvent.setPayload(request.getPayload());
        newEvent.setPageTitle(request.getPageTitle());

        session.setEventCount(session.getEventCount() + 1);
        if (request.getEventType() == EventType.PAGE_VIEW) {
            session.setPageViews(session.getPageViews() + 1);
        }
        session.setLastActivityAt(request.getLastActivityAt());
        sessionRepo.save(session);

        return eventRepo.save(newEvent);
    }
}
