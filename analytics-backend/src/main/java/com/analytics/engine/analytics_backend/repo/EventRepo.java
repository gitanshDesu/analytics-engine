package com.analytics.engine.analytics_backend.repo;

import com.analytics.engine.analytics_backend.dto.model.Event;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EventRepo extends MongoRepository<Event,String> {
}
