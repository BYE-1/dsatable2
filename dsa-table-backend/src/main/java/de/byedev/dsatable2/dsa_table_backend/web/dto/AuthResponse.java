package de.byedev.dsatable2.dsa_table_backend.web.dto;

import de.byedev.dsatable2.dsa_table_backend.model.User;

public class AuthResponse {
    private String token;
    private UserDto user;

    public AuthResponse() {
    }

    public AuthResponse(String token, User user) {
        this.token = token;
        this.user = new UserDto(user);
    }

    public AuthResponse(String token, UserDto user) {
        this.token = token;
        this.user = user;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UserDto getUser() {
        return user;
    }

    public void setUser(UserDto user) {
        this.user = user;
    }
}

