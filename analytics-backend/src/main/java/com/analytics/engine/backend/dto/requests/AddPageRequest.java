package com.analytics.engine.backend.dto.requests;

import com.analytics.engine.backend.enums.PageType;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.util.List;

@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
public class AddPageRequest extends GenericPageRequest{
    private List<String> domains;
    private String basePathUrl;
    public AddPageRequest(String pagePath, PageType pageType,  List<
            String> domains){
        super(pagePath,pageType);
        this.domains = domains;
    }
}
