package com.analytics.engine.backend.service;

import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Visitor;
import com.analytics.engine.backend.repo.VisitorRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@Slf4j
public class VisitorService {

    @Autowired
    private VisitorRepo visitorRepo;

    @Autowired
    private MongoTemplate mongoTemplate;

    /**
     * Atomic upsert + $inc — a read-then-save on `totalSessions` would race when two
     * sessions start concurrently for the same visitor (e.g. two tabs open at once): both
     * read the same count, both write count+1, and one increment is lost. `findAndModify`
     * with `upsert(true)` also folds "create if this is their first-ever session" into the
     * same atomic operation, so there's no separate read to create a document out of.
     */
    public Visitor getOrCreateVisitor(String visitorId, Instant firstSeen) {
        log.debug("getOrCreateVisitor: visitorId={}", visitorId);
        Update update = new Update()
                .inc("totalSessions", 1)
                .setOnInsert("visitorId", visitorId)
                .setOnInsert("firstSeen", firstSeen);

        return mongoTemplate.findAndModify(
                Query.query(Criteria.where("visitorId").is(visitorId)),
                update,
                FindAndModifyOptions.options().returnNew(true).upsert(true),
                Visitor.class
        );
    }

    public Visitor getVisitorFromId(String visitorId) {
        return visitorRepo.findByVisitorId(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor Doesn't Exist!"));
    }

    public void updateLastSeen(String visitorId, Instant lastSeen) {
        log.debug("updateLastSeen: visitorId={} lastSeen={}", visitorId, lastSeen);
        Visitor updated = mongoTemplate.findAndModify(
                Query.query(Criteria.where("visitorId").is(visitorId)),
                new Update().set("lastSeen", lastSeen),
                Visitor.class
        );
        if (updated == null) {
            throw new ResourceNotFoundException("Visitor Doesn't Exist!");
        }
    }
}
