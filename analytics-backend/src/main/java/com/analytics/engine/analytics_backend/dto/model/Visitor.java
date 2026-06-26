package com.analytics.engine.analytics_backend.dto.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Represents a unique browser/device interacting with a Tracking Property.
 *
 * <p>A Visitor may have multiple Sessions over time and is identified
 * using a persistent visitor identifier stored in a browser cookie.</p>
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "visitors")
public class Visitor {
    @Id
    private String id;
    @Indexed(unique = true)
    private String visitorId;
    private Instant firstSeen;
    private Instant lastSeen;
    @Builder.Default
    private Long totalSessions = 0L;
    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;


}
