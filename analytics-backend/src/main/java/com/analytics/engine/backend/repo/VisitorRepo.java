package com.analytics.engine.backend.repo;

import com.analytics.engine.backend.model.Visitor;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface VisitorRepo extends MongoRepository<Visitor,String> {
    Optional<Visitor> findByVisitorId(String visitorId);
}
