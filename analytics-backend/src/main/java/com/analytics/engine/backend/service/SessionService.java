package com.analytics.engine.backend.service;

import com.analytics.engine.backend.dto.requests.SessionEndRequest;
import com.analytics.engine.backend.dto.requests.SessionStartRequest;
import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Session;
import com.analytics.engine.backend.model.Visitor;
import com.analytics.engine.backend.repo.SessionRepo;
import com.analytics.engine.backend.repo.VisitorRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
@Slf4j
public class SessionService {
    @Autowired
    private SessionRepo sessionRepo;

    @Autowired
    private VisitorService visitorService;

    @Autowired
    private VisitorRepo visitorRepo;

    public Session createSession(SessionStartRequest payload){
        //Todo: verify that trackingPropertyId belongs to the userId in cookie (protected route)

        //Todo: Add logic to verify if visitorId is already present or not in db (if yes no need to create new), also sessionId must be unique (uuid-v4 on fe)

        //Todo: Add logic to get visitor meta-data from request headers

        //Add session
        Session newSession = new Session();
        newSession.setTrackingPropertyId(payload.getTrackingPropertyId());
        newSession.setVisitorId(payload.getVisitorId());
        newSession.setSessionId(payload.getSessionId());
        newSession.setStartedAt(payload.getStartedAt());
        newSession.setLandingPage(payload.getLandingPage());

        //set firstSeen in visitor
        Visitor visitor = visitorService.getVisitorFromId(payload.getVisitorId());
        visitor.setFirstSeen(payload.getFirstSeen());
        visitorRepo.save(visitor);

        return sessionRepo.save(newSession);
    }

    public Session endSession(SessionEndRequest payload){

        //Todo: Add verification logic to check if trackingPropId belongs to userId in cookie (protected route)

        //Todo: Add verification logic if visitorId has the sessionId in payload inside their doc

        //Get session by sessionId and visitorId (as session already exist)
        Session existingSession = sessionRepo.findBySessionIdAndVisitorId(payload.getSessionId(),payload.getVisitorId()).orElseThrow(()->new ResourceNotFoundException("Session Doesn't Exist!"));

        existingSession.setLastActivityAt(payload.getLastActivityAt());
        existingSession.setEndedAt(payload.getEndedAt());
        existingSession.setExitPage(payload.getExitPage());
        existingSession.setPageViews(payload.getPageViews());
        existingSession.setEventCount(payload.getEventCount());
        existingSession.setBounced(payload.getBounced());

        Visitor visitor = visitorService.getVisitorFromId(payload.getVisitorId());
        visitor.setLastSeen(payload.getLastSeen());
        visitorRepo.save(visitor);

        return sessionRepo.save(existingSession);


    }


}
