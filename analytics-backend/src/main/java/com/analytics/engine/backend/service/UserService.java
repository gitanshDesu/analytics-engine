package com.analytics.engine.backend.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service responsible for managing User accounts.
 *
 * <p>This service owns all user-related operations that are independent of the
 * authentication process. It manages user information throughout the lifetime
 * of the account.</p>
 *
 * <p>Responsibilities:</p>
 * <ul>
 *     <li>Create and persist new User accounts.</li>
 *     <li>Retrieve User information.</li>
 *     <li>Update user profile and account details.</li>
 *     <li>Update user credentials.</li>
 *     <li>Delete User accounts and perform associated cleanup.</li>
 *     <li>Manage ownership of Tracking Properties.</li>
 * </ul>
 */

@Service
@Slf4j
@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserService {
}
