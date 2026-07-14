package com.analytics.engine.backend.dto.requests;

import com.analytics.engine.backend.enums.EventType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EventRequest {
    private String visitorId; //created and maintained on fe
    private String sessionId; //created and maintained on fe
    private String trackingPropertyId; //from sdk
    private EventType eventType;
    private Instant eventTime; // timestamp created on fe and sent
    private Instant lastActivityAt; //timestamp needed by session
    private Map<String,Object> payload;
    private String pagePath; // send from fe as well
    private String pageTitle;

}
