package com.analytics.engine.backend.service;

import com.analytics.engine.backend.dto.requests.EventRequest;
import com.analytics.engine.backend.model.Event;
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

    public Event createEvent(EventRequest request){
        //Todo: Add verification logic to check if trackingId belongs to userId in cookie (protected route)

        //Todo: check if visitorId and sessionId are in db (if not send error)

        Event newEvent = new Event();

        newEvent.setTrackingPropertyId(request.getTrackingPropertyId());
        newEvent.setVisitorId(request.getVisitorId());
        newEvent.setSessionId(request.getSessionId());
        newEvent.setEventType(request.getEventType());
        newEvent.setPagePath(request.getPagePath());
        newEvent.setEventTime(request.getEventTime());
        newEvent.setPayload(request.getPayload());
        newEvent.setPageTitle(request.getPageTitle());


        //Create event and save in db
        return eventRepo.save(newEvent);
    }

}
