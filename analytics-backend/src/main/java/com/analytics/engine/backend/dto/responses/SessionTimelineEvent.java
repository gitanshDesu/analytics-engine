package com.analytics.engine.backend.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SessionTimelineEvent {
    private String eventType;
    private String pagePath;
    private String pageTitle;
    private Instant eventTime;
    private Map<String, Object> payload;
}
