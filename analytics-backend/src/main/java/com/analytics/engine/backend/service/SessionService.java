package com.analytics.engine.backend.service;

import com.analytics.engine.backend.dto.requests.SessionEndRequest;
import com.analytics.engine.backend.dto.requests.SessionStartRequest;
import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Session;
import com.analytics.engine.backend.repo.SessionRepo;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
@Slf4j
public class SessionService {
    @Autowired
    private SessionRepo sessionRepo;

    @Autowired
    private VisitorService visitorService;

    public Session createSession(SessionStartRequest payload, HttpServletRequest httpRequest){
        //Todo: verify that trackingPropertyId belongs to the userId in cookie (protected route)

        visitorService.getOrCreateVisitor(payload.getVisitorId(), payload.getFirstSeen());

        String userAgent = httpRequest.getHeader("User-Agent");
        String ip = httpRequest.getHeader("X-Forwarded-For") != null
                ? httpRequest.getHeader("X-Forwarded-For").split(",")[0].trim()
                : httpRequest.getRemoteAddr();

        Session newSession = new Session();
        newSession.setTrackingId(payload.getTrackingId());
        newSession.setVisitorId(payload.getVisitorId());
        newSession.setSessionId(payload.getSessionId());
        newSession.setStartedAt(payload.getStartedAt());
        newSession.setLastActivityAt(payload.getLastActivityAt());
        newSession.setLandingPage(payload.getLandingPage());
        newSession.setReferer(httpRequest.getHeader("Referer"));
        newSession.setIpAddress(ip);
        newSession.setBrowser(UserAgentParser.getBrowser(userAgent));
        newSession.setOs(UserAgentParser.getOs(userAgent));
        newSession.setDeviceType(UserAgentParser.getDeviceType(userAgent));
        newSession.setTimezone(payload.getTimezone());
        newSession.setPageViews(0);
        newSession.setEventCount(0);
        newSession.setBounced(false);
        newSession.setDurationSeconds(0L);

        return sessionRepo.save(newSession);
    }

    public Session endSession(SessionEndRequest payload){
        //Todo: Add verification logic to check if trackingPropId belongs to userId in cookie (protected route)

        //Todo: Add verification logic if visitorId has the sessionId in payload inside their doc

        Session existingSession = sessionRepo.findBySessionIdAndVisitorId(payload.getSessionId(), payload.getVisitorId())
                .orElseThrow(() -> new ResourceNotFoundException("Session Doesn't Exist!"));

        existingSession.setEndedAt(payload.getEndedAt());
        existingSession.setLastActivityAt(payload.getLastActivityAt());
        existingSession.setExitPage(payload.getExitPage());
        existingSession.setPageViews(payload.getPageViews());
        existingSession.setEventCount(payload.getEventCount());
        existingSession.setBounced(payload.getBounced());
        existingSession.setDurationSeconds(
                payload.getEndedAt().getEpochSecond() - existingSession.getStartedAt().getEpochSecond()
        );

        visitorService.updateLastSeen(payload.getVisitorId(), payload.getLastSeen());

        return sessionRepo.save(existingSession);
    }

    private static class UserAgentParser {

        static String getBrowser(String ua) {
            if (ua == null) return "Unknown";
            if (ua.contains("Edg/"))     return "Edge";
            if (ua.contains("OPR/"))     return "Opera";
            if (ua.contains("Chrome/"))  return "Chrome";
            if (ua.contains("Firefox/")) return "Firefox";
            if (ua.contains("Safari/") && ua.contains("Version/")) return "Safari";
            return "Unknown";
        }

        static String getOs(String ua) {
            if (ua == null) return "Unknown";
            if (ua.contains("Android"))   return "Android";
            if (ua.contains("iPhone") || ua.contains("iPad")) return "iOS";
            if (ua.contains("Windows"))   return "Windows";
            if (ua.contains("Macintosh")) return "macOS";
            if (ua.contains("Linux"))     return "Linux";
            return "Unknown";
        }

        static String getDeviceType(String ua) {
            if (ua == null) return "Unknown";
            if (ua.contains("iPad") || (ua.contains("Android") && !ua.contains("Mobile"))) return "Tablet";
            if (ua.contains("Mobile") || ua.contains("iPhone")) return "Phone";
            return "Desktop";
        }
    }
}
