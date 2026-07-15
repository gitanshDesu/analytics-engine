package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.requests.SessionEndRequest;
import com.analytics.engine.backend.dto.requests.SessionStartRequest;
import com.analytics.engine.backend.model.Session;
import com.analytics.engine.backend.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/session")
public class SessionController {
    @Autowired
    private SessionService sessionService;

    @PostMapping("/start")
    public ResponseEntity<Session> startSession(@RequestBody SessionStartRequest request, HttpServletRequest httpRequest) {
        log.info("POST /api/v1/session/start - trackingId={} sessionId={} visitorId={}",
                request.getTrackingId(), request.getSessionId(), request.getVisitorId());
        return new ResponseEntity<>(sessionService.createSession(request, httpRequest), HttpStatus.OK);
    }

    @PostMapping("/end")
    public ResponseEntity<Session> endSession(@RequestBody SessionEndRequest request) {
        log.info("POST /api/v1/session/end - sessionId={} visitorId={}", request.getSessionId(), request.getVisitorId());
        return new ResponseEntity<>(sessionService.endSession(request), HttpStatus.OK);
    }
}
