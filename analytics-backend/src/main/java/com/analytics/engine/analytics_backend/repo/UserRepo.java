package com.analytics.engine.analytics_backend.repo;

import com.analytics.engine.analytics_backend.dto.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepo extends MongoRepository<User,String> {
}
