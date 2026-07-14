package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.requests.AddPageRequest;
import com.analytics.engine.backend.model.Page;
import com.analytics.engine.backend.service.PageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pages")
public class PageController {

    @Autowired
    private PageService pageService;

    @PostMapping
    public ResponseEntity<Page> addPage(@RequestBody AddPageRequest request) {
        return new ResponseEntity<>(pageService.addAPageToTrack(request), HttpStatus.CREATED);
    }

    @GetMapping("/{pageId}")
    public ResponseEntity<Page> getPage(@PathVariable String pageId) {
        return new ResponseEntity<>(pageService.getPageFromId(pageId), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<Page>> getAllPages(@RequestParam String trackingId) {
        return new ResponseEntity<>(pageService.getAllPagesTracked(trackingId), HttpStatus.OK);
    }
}
