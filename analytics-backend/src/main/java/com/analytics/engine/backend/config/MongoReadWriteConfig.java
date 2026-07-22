package com.analytics.engine.backend.config;

import com.mongodb.ReadPreference;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;

@Configuration
public class MongoReadWriteConfig {

    // Declaring readMongoTemplate below makes Spring Boot's own @ConditionalOnMissingBean(MongoOperations.class)
    // back off, so it no longer creates the default "mongoTemplate" bean — this replaces it explicitly.
    // @Primary keeps every unqualified MongoTemplate injection (the write path) resolving to this one.
    @Bean(name = "mongoTemplate")
    @Primary
    public MongoTemplate mongoTemplate(MongoDatabaseFactory mongoDatabaseFactory,
                                        MappingMongoConverter mappingMongoConverter) {
        return new MongoTemplate(mongoDatabaseFactory, mappingMongoConverter);
    }

    // Dashboard reads are read-only and tolerant of replication lag, so they're routed to a
    // secondary instead of competing with ingestion traffic on the primary. Against a standalone
    // node (no replicaSet in spring.mongodb.uri) this is a no-op — reads still hit that one node.
    @Bean("readMongoTemplate")
    public MongoTemplate readMongoTemplate(MongoDatabaseFactory mongoDatabaseFactory,
                                            MappingMongoConverter mappingMongoConverter) {
        MongoTemplate template = new MongoTemplate(mongoDatabaseFactory, mappingMongoConverter);
        template.setReadPreference(ReadPreference.secondaryPreferred());
        return template;
    }
}
