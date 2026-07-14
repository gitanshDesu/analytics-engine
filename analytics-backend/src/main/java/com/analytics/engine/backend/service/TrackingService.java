package com.analytics.engine.backend.service;
import com.analytics.engine.backend.dto.GenerateTrackingProp;
import com.analytics.engine.backend.model.TrackingProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service responsible for processing analytics events received from the SDK.
 *
 * Responsibilities:
 * <ul>
 *     <li>Validate incoming tracking requests.</li>
 *     <li>Create or update Visitors and Sessions.</li>
 *     <li>Persist Events.</li>
 *     <li>Compute session metadata such as page views and duration.</li>
 * </ul>
 */

@Service
@Slf4j
public class TrackingService {






    //generates Tracking Property for a User (we get userId + email from cookie)
    //protected route
    public TrackingProperty getTrackingProperty(GenerateTrackingProp payload){
        return null;
    }

    public String generateTrackingId(String pagePath){
        //Write logic to generate unique tracking ids to associate them with several page-paths (a singular tracking id can be used for multiple pages by a user)

        return null;
    }

        //use tracking id to distinguish page(www.yatra.com/cheap-flights/search) user is tracking
    //page path: cheap-flights/search, flight-schedule/seqarch, trains/b2c/listing, trains/b2c/listing/review (using a tracking id can track trains' listing and review as well)








}
