package com.analytics.engine.backend.model;

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
 * Represents a single browsing session of a Visitor.
 *
 * <p>A Session begins when a visitor first accesses a tracked website and
 * ends after a period of inactivity or when the browser session ends.
 * Multiple Events are associated with a single Session.</p>
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "sessions")
public class Session {
    @Id
    private String id;
    @Indexed(unique = true)
    private String sessionId;
    @Indexed
    private String visitorId;
    @Indexed
    private String trackingPropertyId;
    private Instant startedAt;
    private Instant endedAt;
    private Instant lastActivityAt;
    private String landingPage;
    private String exitPage;
    @Builder.Default
    private Integer pageViews = 0;
    @Builder.Default
    private Long durationSeconds = 0L;
    private String referer;
    private String ipAddress;
    private String country;
    private String city;
    private String browser;
    private String os;
    private String deviceType;
    private String timezone;
    @Builder.Default
    private Boolean bounced = false;
    @Builder.Default
    private Integer eventCount = 0;
    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;
}
