package com.analytics.engine.backend.repo;

import com.analytics.engine.backend.model.Page;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PageRepo extends MongoRepository<Page,String> {
}
