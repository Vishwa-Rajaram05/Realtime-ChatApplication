package com.example.chatApp.dto;

import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class LoginResponseDTO {

    private String token;
    private UserDTO userDTO;

}
