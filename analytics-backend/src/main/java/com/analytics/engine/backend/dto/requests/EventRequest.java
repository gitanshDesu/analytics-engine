package com.analytics.engine.backend.dto.requests;

import com.analytics.engine.backend.enums.EventType;
import com.analytics.engine.backend.enums.PageType;

import java.time.Instant;

public class EventRequest {
    private String visitorId; //created and maintained on fe
    private String sessionId; //created and maintained on fe
    private String trackingPropertyId; //from sdk
    private EventType eventType;
    private Instant eventTime; // timestamp created on fe and sent
    private String pageTitle;
    private PageType pageType;

}
