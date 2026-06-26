package com.analytics.engine.analytics_backend.repo;

import com.analytics.engine.analytics_backend.dto.model.Session;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SessionRepo extends MongoRepository<Session,String> {
}
