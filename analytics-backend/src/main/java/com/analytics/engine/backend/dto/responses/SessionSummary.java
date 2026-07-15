package com.analytics.engine.backend.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SessionSummary {
    private String sessionId;
    private String visitorId;
    private Instant startedAt;
    private Instant endedAt;
    private String landingPage;
    private String exitPage;
    private Integer pageViews;
    private Integer eventCount;
    private Long durationSeconds;
    private Boolean bounced;
    private String browser;
    private String os;
    private String deviceType;
}
