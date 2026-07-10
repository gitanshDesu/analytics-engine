package com.analytics.engine.backend.repo;

import com.analytics.engine.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepo extends MongoRepository<User,String> {
     Optional<User> findByEmail(String email);
}
