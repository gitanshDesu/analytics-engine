package com.analytics.engine.backend.service;

import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Visitor;
import com.analytics.engine.backend.repo.VisitorRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Slf4j
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
