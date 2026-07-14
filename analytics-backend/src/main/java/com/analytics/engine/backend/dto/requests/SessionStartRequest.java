package com.analytics.engine.backend.dto.requests;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SessionStartRequest {
    private String trackingId;
    private String visitorId;
    private String sessionId;
    private Instant firstSeen; // visitor model
    private Instant startedAt; // for session model
    private Instant lastActivityAt; // for 1st session request laa == sa
    private String landingPage; // from fe
    private String timezone; // from fe via Intl.DateTimeFormat().resolvedOptions().timeZone

}
