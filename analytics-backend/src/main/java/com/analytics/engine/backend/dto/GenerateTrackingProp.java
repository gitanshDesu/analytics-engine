package com.analytics.engine.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GenerateTrackingProp {
    private String userId;

    private List<String> domains;
    private List<String> pageIds;
    private String trackingId;
}
