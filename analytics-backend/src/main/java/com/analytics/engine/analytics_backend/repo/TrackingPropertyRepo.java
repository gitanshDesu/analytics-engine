package com.analytics.engine.analytics_backend.repo;

import com.analytics.engine.analytics_backend.dto.model.TrackingProperty;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TrackingPropertyRepo extends MongoRepository<TrackingProperty,String> {
}
