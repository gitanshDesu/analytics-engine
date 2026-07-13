package com.analytics.engine.backend.service;

import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Visitor;
import com.analytics.engine.backend.repo.VisitorRepo;
import org.springframework.beans.factory.annotation.Autowired;

public class VisitorService {
    @Autowired
    private VisitorRepo visitorRepo;

    public Visitor createVisitor(){
        return null;
    }

    public Visitor getVisitorFromId(String visitorId){
        return visitorRepo.findById(visitorId).orElseThrow(()->new ResourceNotFoundException("Visitor Doesn't Exist!"));

    }

}
