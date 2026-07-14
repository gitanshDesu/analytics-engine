package com.analytics.engine.backend.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SummaryResponse {
    private long totalSessions;
    private long totalUniqueVisitors;
    private long totalPageViews;
    private double bounceRate;
    private double avgSessionDurationSeconds;
    private double avgPagesPerSession;
    private long newVisitors;
    private long returningVisitors;
}
