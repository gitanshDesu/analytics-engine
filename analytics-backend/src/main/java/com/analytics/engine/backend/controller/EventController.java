package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.requests.EventRequest;
import com.analytics.engine.backend.model.Event;
import com.analytics.engine.backend.service.EventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/event")
public class EventController {
    @Autowired
    private EventService eventService;
    @PostMapping("/register")
    public ResponseEntity<Event> registerEvent(@RequestBody EventRequest request){
        return new ResponseEntity<>(eventService.createEvent(request), HttpStatus.OK);
    }
}
