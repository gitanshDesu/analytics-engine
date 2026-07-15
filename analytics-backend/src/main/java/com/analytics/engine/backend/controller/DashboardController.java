package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.responses.*;
import com.analytics.engine.backend.service.AnalyticDashboardService;
import com.analytics.engine.backend.service.TrackingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@Slf4j
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
        log.info("GET /api/v1/dashboard/{}/summary - from={} to={}", trackingId, from, to);
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getSummary(trackingId, Instant.parse(from), Instant.parse(to)));
    }

    @GetMapping("/{trackingId}/traffic")
    public ResponseEntity<List<TrafficDataPoint>> getTraffic(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(defaultValue = "daily") String granularity) {
        log.info("GET /api/v1/dashboard/{}/traffic - from={} to={} granularity={}", trackingId, from, to, granularity);
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getTrafficOverTime(trackingId, Instant.parse(from), Instant.parse(to), granularity));
    }

    @GetMapping("/{trackingId}/pages")
    public ResponseEntity<PagesResponse> getPages(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to) {
        log.info("GET /api/v1/dashboard/{}/pages - from={} to={}", trackingId, from, to);
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getPages(trackingId, Instant.parse(from), Instant.parse(to)));
    }

    @GetMapping("/{trackingId}/events")
    public ResponseEntity<EventsResponse> getEvents(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to) {
        log.info("GET /api/v1/dashboard/{}/events - from={} to={}", trackingId, from, to);
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getEvents(trackingId, Instant.parse(from), Instant.parse(to)));
    }

    @GetMapping("/{trackingId}/sources")
    public ResponseEntity<List<SourceStat>> getSources(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to) {
        log.info("GET /api/v1/dashboard/{}/sources - from={} to={}", trackingId, from, to);
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getSources(trackingId, Instant.parse(from), Instant.parse(to)));
    }

    @GetMapping("/{trackingId}/devices")
    public ResponseEntity<DevicesResponse> getDevices(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to) {
        log.info("GET /api/v1/dashboard/{}/devices - from={} to={}", trackingId, from, to);
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getDevices(trackingId, Instant.parse(from), Instant.parse(to)));
    }

    @GetMapping("/{trackingId}/funnel")
    public ResponseEntity<FunnelResponse> getFunnel(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam List<String> steps) {
        log.info("GET /api/v1/dashboard/{}/funnel - from={} to={} steps={}", trackingId, from, to, steps);
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getFunnel(trackingId, Instant.parse(from), Instant.parse(to), steps));
    }

    @GetMapping("/{trackingId}/sessions")
    public ResponseEntity<SessionListResponse> getSessions(
            @PathVariable String trackingId,
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(defaultValue = "50") int limit) {
        log.info("GET /api/v1/dashboard/{}/sessions - from={} to={} limit={}", trackingId, from, to, limit);
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getSessions(trackingId, Instant.parse(from), Instant.parse(to), limit));
    }

    @GetMapping("/{trackingId}/sessions/{sessionId}")
    public ResponseEntity<SessionDetailResponse> getSessionDetail(
            @PathVariable String trackingId,
            @PathVariable String sessionId) {
        log.info("GET /api/v1/dashboard/{}/sessions/{}", trackingId, sessionId);
        assertOwnership(trackingId);
        return ResponseEntity.ok(dashboardService.getSessionDetail(trackingId, sessionId));
    }

    private void assertOwnership(String trackingId) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        trackingService.assertOwnership(trackingId, userId);
    }
}
