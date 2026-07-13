package com.analytics.engine.backend.controller;

import com.analytics.engine.backend.dto.requests.CreateUserRequest;
import com.analytics.engine.backend.dto.requests.GenericUserRequest;
import com.analytics.engine.backend.model.User;
import com.analytics.engine.backend.service.AuthService;
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
    public ResponseEntity<User> registerUser(@Valid @RequestBody CreateUserRequest request){
        return new ResponseEntity<>(authService.register(request), HttpStatus.OK);
    }

    @PostMapping("/login")
    public ResponseEntity<User> loginUser(@Valid @RequestBody GenericUserRequest request){
        return new ResponseEntity<>(authService.login(request),HttpStatus.OK);
    }
}
