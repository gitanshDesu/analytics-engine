package com.analytics.engine.analytics_backend.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service responsible for managing authentication tokens.
 *
 * <p>This service encapsulates all JWT-related operations including token
 * generation, validation, parsing and refresh logic. It is used by the
 * UserService during authentication and authorization workflows.</p>
 *
 * <p>Responsibilities:</p>
 * <ul>
 *     <li>Generate Access Tokens.</li>
 *     <li>Generate Refresh Tokens.</li>
 *     <li>Validate Access and Refresh Tokens.</li>
 *     <li>Extract claims from JWTs.</li>
 *     <li>Determine token expiration.</li>
 *     <li>Issue new Access Tokens using valid Refresh Tokens.</li>
 *     <li>Invalidate Refresh Tokens during Logout.</li>
 * </ul>
 */

@Service
@Slf4j
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TokenService {
}
