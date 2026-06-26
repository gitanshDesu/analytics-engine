package com.analytics.engine.analytics_backend.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service responsible for handling User authentication workflows.
 *
 * <p>This service authenticates users, manages login sessions and delegates
 * JWT-related operations to the TokenService.</p>
 *
 * <p>Responsibilities:</p>
 * <ul>
 *     <li>Authenticate users during Login.</li>
 *     <li>Register new users (Sign Up).</li>
 *     <li>Handle user Logout.</li>
 *     <li>Issue Access and Refresh Tokens upon successful authentication.</li>
 *     <li>Refresh expired Access Tokens using valid Refresh Tokens.</li>
 *     <li>Validate user credentials before authentication.</li>
 * </ul>
 */

@Service
@Slf4j
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuthService {
}
