package com.analytics.engine.analytics_backend.repo;

import com.analytics.engine.analytics_backend.dto.model.Page;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PageRepo extends MongoRepository<Page,String> {
}
