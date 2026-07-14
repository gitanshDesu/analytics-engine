package com.analytics.engine.backend.service;

import com.analytics.engine.backend.dto.GenerateTrackingProp;
import com.analytics.engine.backend.dto.requests.AddPageRequest;
import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Page;
import com.analytics.engine.backend.model.TrackingProperty;
import com.analytics.engine.backend.repo.PageRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class PageService {
    @Autowired
    private TrackingService trackingPropertyService;

    @Autowired
    private PageRepo pageRepo;

    //Note: Derive BasePath from PagePath

    //adds a Page for user under a basePath (/listing, /review, /search)
    public Page addAPageToTrack(AddPageRequest payload){
        //Todo: Get user id from cookie
        String userId;

        //Generate Tracking Prop for page

        String trackingId = trackingPropertyService.generateTrackingId(payload.getPagePath());
        GenerateTrackingProp trackingPropPayload = new GenerateTrackingProp();
        TrackingProperty trackingProperty = trackingPropertyService.getTrackingProperty(trackingPropPayload);

        //Save Page in repo and return
        return null;

    }

    public List<Page>  getAllPagesTracked(String trackingId){
        //Todo: write logic get all pages and create Pages doc and return
        return new ArrayList<>();
    }

    public Page getPageFromId(String pageId){
        return pageRepo.findById(pageId).orElseThrow(()->new ResourceNotFoundException("Page Doesn't Exist!"));
    }
}
