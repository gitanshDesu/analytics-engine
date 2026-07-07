package com.analytics.engine.backend.repo;

import com.analytics.engine.backend.model.Event;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EventRepo extends MongoRepository<Event,String> {
}
