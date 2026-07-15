package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.requests.CreateTrackingPropertyRequest;
import com.analytics.engine.backend.model.TrackingProperty;
import com.analytics.engine.backend.service.TrackingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tracking")
public class TrackingController {

    @Autowired
    private TrackingService trackingService;

    @PostMapping
    public ResponseEntity<TrackingProperty> createTrackingProperty(@RequestBody CreateTrackingPropertyRequest request) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return new ResponseEntity<>(trackingService.createTrackingProperty(userId, request.getDomains()), HttpStatus.CREATED);
    }

    @GetMapping("/{trackingId}")
    public ResponseEntity<TrackingProperty> getTrackingProperty(@PathVariable String trackingId) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        trackingService.assertOwnership(trackingId, userId);
        return new ResponseEntity<>(trackingService.getByTrackingId(trackingId), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<TrackingProperty>> getAllTrackingProperties() {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return new ResponseEntity<>(trackingService.getAllByUserId(userId), HttpStatus.OK);
    }
}
