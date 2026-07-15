package com.analytics.engine.backend.service;

import com.analytics.engine.backend.exception.ForbiddenException;
import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.TrackingProperty;
import com.analytics.engine.backend.repo.TrackingPropertyRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class TrackingService {

    @Autowired
    private TrackingPropertyRepo trackingPropertyRepo;

    @Autowired
    private UserService userService;

    public TrackingProperty createTrackingProperty(String userId, List<String> domains) {
        TrackingProperty tp = new TrackingProperty();
        tp.setUserId(userId);
        tp.setDomains(domains);
        tp.setTrackingId(generateTrackingId());
        tp.setPageIds(new ArrayList<>());

        TrackingProperty saved = trackingPropertyRepo.save(tp);

        userService.addTrackingPropertyId(userId, saved.getId());

        log.info("TrackingProperty created: trackingId={} for userId={}", saved.getTrackingId(), userId);
        return saved;
    }

    public TrackingProperty getByTrackingId(String trackingId) {
        return trackingPropertyRepo.findByTrackingId(trackingId)
                .orElseThrow(() -> new ResourceNotFoundException("TrackingProperty not found for trackingId=" + trackingId));
    }

    public List<TrackingProperty> getAllByUserId(String userId) {
        return trackingPropertyRepo.findAllByUserId(userId);
    }

    public void assertOwnership(String trackingId, String userId) {
        TrackingProperty tp = getByTrackingId(trackingId);
        if (!tp.getUserId().equals(userId)) {
            throw new ForbiddenException("You don't have access to this resource");
        }
    }

    public void addPageIdToTrackingProperty(String trackingPropertyId, String pageId) {
        TrackingProperty tp = trackingPropertyRepo.findById(trackingPropertyId)
                .orElseThrow(() -> new ResourceNotFoundException("TrackingProperty not found"));
        tp.getPageIds().add(pageId);
        trackingPropertyRepo.save(tp);
    }

    private String generateTrackingId() {
        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return "TP-" + token;
    }
}
