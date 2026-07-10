package com.analytics.engine.backend.service;

import com.analytics.engine.backend.dto.requests.CreateUserRequest;
import com.analytics.engine.backend.dto.responses.CreateUserResponse;
import com.analytics.engine.backend.exception.UserAlreadyExistsException;
import com.analytics.engine.backend.model.User;
import com.analytics.engine.backend.repo.UserRepo;
import com.analytics.engine.backend.util.PasswordUtil;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Optional;

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
@AllArgsConstructor
@NoArgsConstructor
public class UserService {
    @Autowired
    private UserRepo userRepo;
    @Autowired
    private PasswordUtil passwordUtil;
    public CreateUserResponse createUser(CreateUserRequest payload){
        //1. Do input validations (done)

        //2. After successful input validation check if user already exists with same email or not (done)

        //3. Add user (let other properties remain null) (done)
            //a. hash password and add in db (done)
        //4. return user(done)
        Optional<User> existingUser = userRepo.findByEmail(payload.getEmail());

        if(existingUser.isPresent()){
            log.warn("User already exists for {}",payload.getEmail());
            throw new UserAlreadyExistsException("User Already Exists!");
        }

        String hashedPw = passwordUtil.hashPassword(payload.getPassword());

        User newUser = new User();
        newUser.setEmail(payload.getEmail());
        newUser.setFullName(payload.getFullName());
        newUser.setTrackingPropertyIds(new ArrayList<>());
        newUser.setPassword(hashedPw);

        User createdUser = userRepo.save(newUser);


        return new CreateUserResponse(createdUser.getEmail(),createdUser.getFullName());


    }

}
