package com.analytics.engine.backend.util;

import org.mindrot.jbcrypt.BCrypt;
import org.springframework.stereotype.Component;

@Component
public class PasswordUtil {
    public String hashPassword(String plainTextPassword){
        return BCrypt.hashpw(plainTextPassword,BCrypt.gensalt(10));
    }
    public Boolean checkPassword(String plainTextPassword,String storedHash){
        return BCrypt.checkpw(plainTextPassword,storedHash);
    }
}
