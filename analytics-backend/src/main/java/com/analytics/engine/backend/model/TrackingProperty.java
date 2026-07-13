package com.analytics.engine.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/**
 * Represents a website or application monitored by the Analytics Engine.
 *
 * <p>A Tracking Property belongs to exactly one User and contains the
 * configuration required to accept analytics events from one or more
 * allowed domains.</p>
 */

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document
public class TrackingProperty {
    @Id
    private String id;
    private List<String> domains; //allowlist of domains (from which we entertain tracking request coming from sdk)
    @Indexed(unique = true)
    private String trackingId;
    private List<String> pageIds;
    private String userId;
    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;

}
