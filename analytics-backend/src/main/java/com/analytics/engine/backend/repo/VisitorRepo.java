package com.analytics.engine.backend.repo;

import com.analytics.engine.backend.model.Visitor;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface VisitorRepo extends MongoRepository<Visitor,String> {
}
