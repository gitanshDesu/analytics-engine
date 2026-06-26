package com.analytics.engine.analytics_backend.dto.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/**
 * Represents a registered user of the Analytics Platform.
 *
 * <p>A User owns one or more Tracking Properties that are used to monitor
 * websites or applications. User documents are persisted in the
 * {@code users} MongoDB collection.</p>
 */

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {
    @Id
    private String id;
    @Indexed(unique = true)
    private String email;
    private String fullName;
    private String password;
    private String refreshToken;
    private List<String> trackingPropertyIds;
    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

}
