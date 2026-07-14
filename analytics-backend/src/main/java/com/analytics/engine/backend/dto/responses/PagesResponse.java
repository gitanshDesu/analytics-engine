package com.analytics.engine.backend.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PagesResponse {
    private List<PageStat> topPages;
    private List<PageStat> topLandingPages;
    private List<PageStat> topExitPages;
}
