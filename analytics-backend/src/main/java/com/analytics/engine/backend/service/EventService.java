package com.analytics.engine.backend.service;

import com.analytics.engine.backend.model.Event;
import com.analytics.engine.backend.repo.EventRepo;
import org.springframework.beans.factory.annotation.Autowired;

public class EventService {

    @Autowired
    private EventRepo eventRepo;

    public Event createEvent(){

        //1. Create visitor if doesn't exist
        //2. Create Session if doesn't exist

        //3. Create event and save in db
        return null;
    }

}
