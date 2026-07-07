package com.analytics.engine.backend.model;

import com.analytics.engine.backend.enums.EventType;
import com.analytics.engine.backend.enums.PageType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

/**
 * Represents a single user interaction recorded by the Analytics Engine.
 *
 * <p>Events are generated during a Session and capture actions such as
 * page views, button clicks, link clicks, scrolling and form submissions.</p>
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "events")
public class Event {
    @Id
    private String id;
    @Indexed
    private String trackingPropertyId;
    @Indexed
    private String visitorId;
    @Indexed
    private String sessionId;
    @Indexed
    private EventType eventType;
    private String pagePath;
    @Indexed
    private Instant eventTime;
    private Map<String, Object> payload;
    @CreatedDate
    private Instant createdAt;
    private String pageTitle;
    private PageType pageType;
}
