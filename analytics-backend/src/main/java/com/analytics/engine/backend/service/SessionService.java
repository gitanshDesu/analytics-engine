package com.analytics.engine.backend.service;

import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Session;
import com.analytics.engine.backend.repo.SessionRepo;
import org.springframework.beans.factory.annotation.Autowired;

public class SessionService {
    @Autowired
    private SessionRepo sessionRepo;
    public Session createSession(){
        return null;
    }

    //verify if session is valid (i.e. from allowed domain + url i.e. wwww.yatra.com/cheap-flights)
    private Boolean verifySession(){
        return false;
    }


}
