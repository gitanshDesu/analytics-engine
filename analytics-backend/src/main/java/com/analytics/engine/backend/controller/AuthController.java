package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.requests.CreateUserRequest;
import com.analytics.engine.backend.dto.requests.GenericUserRequest;
import com.analytics.engine.backend.dto.responses.GenericUserResponse;
import com.analytics.engine.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<GenericUserResponse> registerUser(
            @Valid @RequestBody CreateUserRequest request,
            HttpServletResponse response) {
        return new ResponseEntity<>(authService.register(request, response), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<GenericUserResponse> loginUser(
            @Valid @RequestBody GenericUserRequest request,
            HttpServletResponse response) {
        return new ResponseEntity<>(authService.login(request, response), HttpStatus.OK);
    }

    @PostMapping("/refresh")
    public ResponseEntity<GenericUserResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {
        return new ResponseEntity<>(authService.refresh(request, response), HttpStatus.OK);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response) {
        authService.logout(request, response);
        return ResponseEntity.noContent().build();
    }
}
