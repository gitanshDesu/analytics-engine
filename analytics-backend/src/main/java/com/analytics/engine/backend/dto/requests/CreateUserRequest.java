package com.analytics.engine.backend.dto.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
public class CreateUserRequest extends GenericUserRequest {

    @NotBlank(message = "full name cannot be empty or null")
    @Size(min=5, max=50, message = "Full Name must be between 3 and 50 char")
    private String fullName;

   public CreateUserRequest(String email, String fullName, String password){
       super(email,password);
       this.fullName = fullName;
   }
}
