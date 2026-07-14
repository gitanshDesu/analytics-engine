package com.analytics.engine.backend.dto.requests;

import com.analytics.engine.backend.enums.PageType;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
public class AddPageRequest extends GenericPageRequest {
    private String trackingId;

    public AddPageRequest(String pagePath, PageType pageType, String trackingId) {
        super(pagePath, pageType);
        this.trackingId = trackingId;
    }
}
