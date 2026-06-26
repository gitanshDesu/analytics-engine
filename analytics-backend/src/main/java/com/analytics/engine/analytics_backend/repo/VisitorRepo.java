package com.analytics.engine.analytics_backend.repo;

import com.analytics.engine.analytics_backend.dto.model.Visitor;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface VisitorRepo extends MongoRepository<Visitor,String> {
}
