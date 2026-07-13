package com.analytics.engine.backend.service;

import com.analytics.engine.backend.dto.requests.CreateUserRequest;
import com.analytics.engine.backend.dto.requests.GenericUserRequest;
import com.analytics.engine.backend.exception.UserNotFoundException;
import com.analytics.engine.backend.model.User;
import com.analytics.engine.backend.repo.UserRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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
public class AuthService {

    @Autowired
    private UserService userService;
    @Autowired
    private UserRepo userRepo;

    public User register(CreateUserRequest payload){
        //create User
        User newUser = userService.createUser(payload);

        //Todo: Add jwt logic (store user id and email in cookie)

        return newUser;
    }

    public User login(GenericUserRequest payload){
        //Todo: Add jwt logic (store user id and email in cookie)
        //Todo: Add password verify logic as well (if email exists then verify password from DB)f
        return userRepo.findByEmail(payload.getEmail()).orElseThrow(()->new UserNotFoundException("User Doesn't Exist!"));

    }



}
