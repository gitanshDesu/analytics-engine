package com.analytics.engine.backend.dto.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateUserRequest {
    @Email
    @NotBlank(message = "email cannot be empty or null")
    private String email;
    @NotBlank(message = "full name cannot be empty or null")
    @Size(min=5, max=50, message = "Full Name must be between 3 and 50 char")
    private String fullName;

    @NotBlank(message = "Password cannot be empty or null")
    @Size(min=8,message = "Password  should at least be 8 char long")
    @Pattern(
            regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).*$",
            message = "Password must contain at least one digit, one lowercase, one uppercase letter, and one special character (@#$%^+=!)"
    )
    private String password;
}
