package com.analytics.engine.backend.dto.requests;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SessionEndRequest {
    private String trackingId;
    private String visitorId;
    private String sessionId;
    private Instant endedAt;
    private Instant lastActivityAt; //for session (to avoid stale laa)
    private Instant lastSeen; //also for visitor model
    private String exitPage;
    private Integer pageViews = 0;
    private Integer eventCount = 0;
    private Boolean bounced = false;
}
