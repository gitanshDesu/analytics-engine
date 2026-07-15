package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.responses.*;
import com.analytics.engine.backend.service.AnalyticDashboardService;
import com.analytics.engine.backend.service.TrackingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    @Autowired
    private AnalyticDashboardService dashboardService;

    @Autowired
    private TrackingService trackingService;

    @GetMapping("/{trackingId}/summary")
    public ResponseEntity<SummaryResponse> getSummary(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to) {
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getSummary(trackingId, Instant.parse(from), Instant.parse(to)));
    }

    @GetMapping("/{trackingId}/traffic")
    public ResponseEntity<List<TrafficDataPoint>> getTraffic(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(defaultValue = "daily") String granularity) {
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getTrafficOverTime(trackingId, Instant.parse(from), Instant.parse(to), granularity));
    }

    @GetMapping("/{trackingId}/pages")
    public ResponseEntity<PagesResponse> getPages(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to) {
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getPages(trackingId, Instant.parse(from), Instant.parse(to)));
    }

    @GetMapping("/{trackingId}/events")
    public ResponseEntity<EventsResponse> getEvents(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to) {
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getEvents(trackingId, Instant.parse(from), Instant.parse(to)));
    }

    @GetMapping("/{trackingId}/sources")
    public ResponseEntity<List<SourceStat>> getSources(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to) {
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getSources(trackingId, Instant.parse(from), Instant.parse(to)));
    }

    @GetMapping("/{trackingId}/devices")
    public ResponseEntity<DevicesResponse> getDevices(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to) {
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getDevices(trackingId, Instant.parse(from), Instant.parse(to)));
    }

    private void assertOwnership(String trackingId) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        trackingService.assertOwnership(trackingId, userId);
    }
}
