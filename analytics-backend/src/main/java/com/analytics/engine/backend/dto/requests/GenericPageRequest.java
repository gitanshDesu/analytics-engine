package com.analytics.engine.backend.dto.requests;

import com.analytics.engine.backend.enums.PageType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GenericPageRequest {
    private String pagePath;
    private PageType pageType;
}
