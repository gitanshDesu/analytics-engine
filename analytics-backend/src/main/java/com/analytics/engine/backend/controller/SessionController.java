package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.requests.SessionEndRequest;
import com.analytics.engine.backend.dto.requests.SessionStartRequest;
import com.analytics.engine.backend.model.Session;
import com.analytics.engine.backend.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/session")
public class SessionController {
    @Autowired
    private SessionService sessionService;

    @PostMapping("/start")
    public ResponseEntity<Session> startSession(SessionStartRequest request, HttpServletRequest httpRequest){
        return new ResponseEntity<>(sessionService.createSession(request, httpRequest), HttpStatus.OK);
    }

    @PostMapping("/end")
    public ResponseEntity<Session> endSession(SessionEndRequest request){
        return new ResponseEntity<>(sessionService.endSession(request), HttpStatus.OK);
    }
}
