package com.analytics.engine.backend.repo;

import com.analytics.engine.backend.model.Visitor;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface VisitorRepo extends MongoRepository<Visitor,String> {
    Optional<Visitor> findByVisitorId(String visitorId);
    long countByVisitorIdInAndFirstSeenBetween(List<String> visitorIds, Instant from, Instant to);
}
