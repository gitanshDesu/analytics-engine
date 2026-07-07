package com.analytics.engine.backend.repo;

import com.analytics.engine.backend.model.TrackingProperty;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TrackingPropertyRepo extends MongoRepository<TrackingProperty,String> {
}
