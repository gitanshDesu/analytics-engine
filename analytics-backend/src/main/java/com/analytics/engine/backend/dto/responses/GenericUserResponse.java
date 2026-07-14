package com.analytics.engine.backend.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GenericUserResponse {
    private String id;
    private String email;
    private String fullName;
}
