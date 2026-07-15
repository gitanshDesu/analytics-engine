package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.responses.GenericUserResponse;
import com.analytics.engine.backend.exception.ForbiddenException;
import com.analytics.engine.backend.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/user")
public class UserController {
    @Autowired
    private UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<GenericUserResponse> getUserById(@PathVariable String id) {
        String authenticatedUserId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        log.info("GET /api/v1/user/{} - requestedBy={}", id, authenticatedUserId);
        if (!authenticatedUserId.equals(id)) {
            throw new ForbiddenException("You can only access your own profile");
        }
        return new ResponseEntity<>(userService.getUserFromId(id), HttpStatus.OK);
    }
}
