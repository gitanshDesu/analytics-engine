package com.analytics.engine.analytics_backend.dto.model;

import com.analytics.engine.analytics_backend.dto.enums.EventType;
import com.analytics.engine.analytics_backend.dto.enums.PageType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

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
