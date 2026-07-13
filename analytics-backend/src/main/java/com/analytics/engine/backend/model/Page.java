package com.analytics.engine.backend.model;

import com.analytics.engine.backend.enums.PageType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Represents a page that belongs to a Tracking Property.
 *
 * <p>A Page stores metadata about a trackable page within a website or
 * application. It is used to categorize analytics events and provide
 * contextual information such as the page's path, title and type.
 *
 * <p>Each Page belongs to exactly one Tracking Property and can have
 * multiple Events associated with it throughout its lifetime.</p>
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "pages")
public class Page {
    @Id
    private String id;
    private String trackingId;
    @Indexed(unique = true)
    private String pagePath;
    private PageType pageType;

    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;

}
