package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.requests.AddPageRequest;
import com.analytics.engine.backend.model.Page;
import com.analytics.engine.backend.service.PageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/pages")
public class PageController {

    @Autowired
    private PageService pageService;

    @PostMapping
    public ResponseEntity<Page> addPage(@RequestBody AddPageRequest request) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        log.info("POST /api/v1/pages - userId={} trackingId={} pagePath={}", userId, request.getTrackingId(), request.getPagePath());
        return new ResponseEntity<>(pageService.addAPageToTrack(request, userId), HttpStatus.CREATED);
    }

    @GetMapping("/{pageId}")
    public ResponseEntity<Page> getPage(@PathVariable String pageId) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        log.info("GET /api/v1/pages/{} - userId={}", pageId, userId);
        return new ResponseEntity<>(pageService.getPageFromId(pageId, userId), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<Page>> getAllPages(@RequestParam String trackingId) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        log.info("GET /api/v1/pages - trackingId={} userId={}", trackingId, userId);
        return new ResponseEntity<>(pageService.getAllPagesTracked(trackingId, userId), HttpStatus.OK);
    }
}
