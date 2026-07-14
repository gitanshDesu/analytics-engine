package com.analytics.engine.backend.repo;

import com.analytics.engine.backend.model.TrackingProperty;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface TrackingPropertyRepo extends MongoRepository<TrackingProperty,String> {
    Optional<TrackingProperty> findByUserId(String userId);
    List<TrackingProperty> findAllByUserId(String userId);
    Optional<TrackingProperty> findByTrackingId(String trackingId);
}
