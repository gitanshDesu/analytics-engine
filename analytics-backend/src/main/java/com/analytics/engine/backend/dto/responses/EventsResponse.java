package com.analytics.engine.backend.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EventsResponse {
    private long totalEvents;
    private List<DeviceBreakdown> eventTypeBreakdown;
    private List<DeviceBreakdown> topLinkClicks;
    private List<DeviceBreakdown> topButtonClicks;
    private List<DeviceBreakdown> topFormSubmits;
    private List<DeviceBreakdown> scrollDepthBreakdown;
}
