package com.analytics.engine.backend.repo;

import com.analytics.engine.backend.model.Session;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface SessionRepo extends MongoRepository<Session,String> {
    Optional<Session> findBySessionIdAndVisitorId(String sessionId, String visitorId);
}
