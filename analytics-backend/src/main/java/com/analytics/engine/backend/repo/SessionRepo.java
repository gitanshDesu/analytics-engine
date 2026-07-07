package com.analytics.engine.backend.repo;

import com.analytics.engine.backend.model.Session;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SessionRepo extends MongoRepository<Session,String> {
}
