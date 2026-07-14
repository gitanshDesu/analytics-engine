package com.analytics.engine.backend.service;

import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Visitor;
import com.analytics.engine.backend.repo.VisitorRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@Slf4j
public class VisitorService {

    @Autowired
    private VisitorRepo visitorRepo;

    public Visitor createVisitor(String visitorId, Instant firstSeen) {
        Visitor visitor = Visitor.builder()
                .visitorId(visitorId)
                .firstSeen(firstSeen)
                .totalSessions(0L)
                .build();
        log.info("Creating new visitor: visitorId={}", visitorId);
        return visitorRepo.save(visitor);
    }

    // Returns existing visitor or creates one if this is their first session
    public Visitor getOrCreateVisitor(String visitorId, Instant firstSeen) {
        Visitor visitor = visitorRepo.findByVisitorId(visitorId)
                .orElseGet(() -> createVisitor(visitorId, firstSeen));
        visitor.setTotalSessions(visitor.getTotalSessions() + 1);
        return visitorRepo.save(visitor);
    }

    public Visitor getVisitorFromId(String visitorId) {
        return visitorRepo.findByVisitorId(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor Doesn't Exist!"));
    }

    public void updateLastSeen(String visitorId, Instant lastSeen) {
        Visitor visitor = getVisitorFromId(visitorId);
        visitor.setLastSeen(lastSeen);
        visitorRepo.save(visitor);
    }
}
