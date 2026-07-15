package com.analytics.engine.backend.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SessionListResponse {
    private List<SessionSummary> sessions;
}
