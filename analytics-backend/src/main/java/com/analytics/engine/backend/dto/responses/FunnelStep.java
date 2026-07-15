package com.analytics.engine.backend.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FunnelStep {
    private String label;
    private String eventType;
    private String textFilter;
    private long sessionCount;
    private double percentOfFirstStep;
    private double percentOfPreviousStep;
}
