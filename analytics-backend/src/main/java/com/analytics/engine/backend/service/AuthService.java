package com.analytics.engine.backend.service;

import com.analytics.engine.backend.dto.requests.CreateUserRequest;
import com.analytics.engine.backend.dto.requests.GenericUserRequest;
import com.analytics.engine.backend.dto.responses.GenericUserResponse;
import com.analytics.engine.backend.exception.InvalidCredentialsException;
import com.analytics.engine.backend.exception.UserNotFoundException;
import com.analytics.engine.backend.model.User;
import com.analytics.engine.backend.repo.UserRepo;
import com.analytics.engine.backend.util.PasswordUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class AuthService {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private PasswordUtil passwordUtil;

    @Autowired
    private TokenService tokenService;

    public GenericUserResponse register(CreateUserRequest payload, HttpServletResponse response) {
        log.info("Registering new user: email={}", payload.getEmail());
        User newUser = userService.createUser(payload);
        issueTokens(newUser, response);
        log.info("User registered successfully: userId={} email={}", newUser.getId(), newUser.getEmail());
        return toResponse(newUser);
    }

    public GenericUserResponse login(GenericUserRequest payload, HttpServletResponse response) {
        String email = payload.getEmail().trim().toLowerCase();
        log.info("Login attempt: email={}", email);
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User Doesn't Exist!"));

        if (!passwordUtil.checkPassword(payload.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid credentials");
        }

        issueTokens(user, response);
        log.info("Login successful: userId={} email={}", user.getId(), user.getEmail());
        return toResponse(user);
    }

    public GenericUserResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = extractCookie(request, "refreshToken");
        if (rawRefreshToken == null) {
            throw new InvalidCredentialsException("Refresh token missing");
        }

        // Extract userId from the refresh token cookie (we embed it as a prefix: "<userId>:<uuid>")
        String[] parts = rawRefreshToken.split(":", 2);
        if (parts.length != 2) {
            throw new InvalidCredentialsException("Malformed refresh token");
        }
        String userId = parts[0];

        log.info("Token refresh: userId={}", userId);
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid refresh token"));

        if (!tokenService.verifyRefreshToken(rawRefreshToken, user.getRefreshToken())) {
            // Token mismatch — possible replay attack; invalidate stored token
            log.warn("Refresh token mismatch — possible replay attack: userId={}", userId);
            user.setRefreshToken(null);
            userRepo.save(user);
            throw new InvalidCredentialsException("Invalid refresh token");
        }

        issueTokens(user, response);
        return toResponse(user);
    }

    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = extractCookie(request, "refreshToken");
        if (rawRefreshToken != null) {
            String[] parts = rawRefreshToken.split(":", 2);
            if (parts.length == 2) {
                log.info("Logout: userId={}", parts[0]);
                userRepo.findById(parts[0]).ifPresent(user -> {
                    user.setRefreshToken(null);
                    userRepo.save(user);
                });
            }
        }
        clearCookie(response, "accessToken", "/");
        clearCookie(response, "refreshToken", "/analytics-backend/api/v1/auth");
    }

    // Generates both tokens, persists hashed refresh token, sets cookies.
    private void issueTokens(User user, HttpServletResponse response) {
        String accessToken = tokenService.generateAccessToken(user);

        // Embed userId as prefix so /refresh can look up the user without a DB scan
        String rawRefreshToken = user.getId() + ":" + tokenService.generateRefreshToken();
        String hashedRefreshToken = tokenService.hashRefreshToken(rawRefreshToken);

        user.setRefreshToken(hashedRefreshToken);
        userRepo.save(user);

        setTokenCookie(response, "accessToken", accessToken,
                (int) (tokenService.getAccessTokenExpiryMs() / 1000), "/");
        setTokenCookie(response, "refreshToken", rawRefreshToken,
                (int) (tokenService.getRefreshTokenExpiryMs() / 1000),
                "/analytics-backend/api/v1/auth");
    }

    private void setTokenCookie(HttpServletResponse response, String name, String value,
                                 int maxAgeSeconds, String path) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath(path);
        cookie.setMaxAge(maxAgeSeconds);
        response.addCookie(cookie);
    }

    private void clearCookie(HttpServletResponse response, String name, String path) {
        Cookie cookie = new Cookie(name, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath(path);
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private String extractCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (name.equals(c.getName())) return c.getValue();
        }
        return null;
    }

    private GenericUserResponse toResponse(User user) {
        return new GenericUserResponse(user.getId(), user.getEmail(), user.getFullName());
    }
}
