package com.analytics.engine.backend.service;

import com.analytics.engine.backend.dto.requests.CreateUserRequest;
import com.analytics.engine.backend.dto.requests.GenericUserRequest;
import com.analytics.engine.backend.exception.InvalidCredentialsException;
import com.analytics.engine.backend.exception.UserNotFoundException;
import com.analytics.engine.backend.model.User;
import com.analytics.engine.backend.repo.UserRepo;
import com.analytics.engine.backend.util.PasswordUtil;
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

    public User register(CreateUserRequest payload){
        User newUser = userService.createUser(payload);
        //Todo: Add jwt logic (store user id and email in cookie)
        return newUser;
    }

    public User login(GenericUserRequest payload){
        //Todo: Add jwt logic (store user id and email in cookie)
        User user = userRepo.findByEmail(payload.getEmail())
                .orElseThrow(() -> new UserNotFoundException("User Doesn't Exist!"));

        if (!passwordUtil.checkPassword(payload.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid credentials");
        }

        return user;
    }
}
