package com.analytics.engine.backend.repo;

import com.analytics.engine.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepo extends MongoRepository<User,String> {
}
