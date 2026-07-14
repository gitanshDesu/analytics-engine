package com.analytics.engine.backend.service;

import com.analytics.engine.backend.dto.requests.AddPageRequest;
import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Page;
import com.analytics.engine.backend.model.TrackingProperty;
import com.analytics.engine.backend.repo.PageRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
public class PageService {

    @Autowired
    private TrackingService trackingService;

    @Autowired
    private PageRepo pageRepo;

    public Page addAPageToTrack(AddPageRequest payload) {
        TrackingProperty trackingProperty = trackingService.getByTrackingId(payload.getTrackingId());

        Page page = new Page();
        page.setTrackingId(trackingProperty.getTrackingId());
        page.setPagePath(payload.getPagePath());
        page.setPageType(payload.getPageType());

        Page savedPage = pageRepo.save(page);

        trackingService.addPageIdToTrackingProperty(trackingProperty.getId(), savedPage.getId());

        log.info("Page added: pageId={} under trackingId={}", savedPage.getId(), trackingProperty.getTrackingId());
        return savedPage;
    }

    public List<Page> getAllPagesTracked(String trackingId) {
        return pageRepo.findByTrackingId(trackingId);
    }

    public Page getPageFromId(String pageId) {
        return pageRepo.findById(pageId).orElseThrow(() -> new ResourceNotFoundException("Page Doesn't Exist!"));
    }
}
