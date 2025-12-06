package de.byedev.dsatable2.dsa_table_backend.web.dto;

import de.byedev.dsatable2.dsa_table_backend.model.ChatMessage;

import java.time.OffsetDateTime;

public class ChatMessageDto {
    private Long id;
    private Long sessionId;
    private UserDto author;
    private String message;
    private OffsetDateTime createdAt;

    public ChatMessageDto() {
    }

    public ChatMessageDto(ChatMessage chatMessage) {
        this.id = chatMessage.getId();
        this.sessionId = chatMessage.getSession().getId();
        this.author = new UserDto(chatMessage.getAuthor());
        this.message = chatMessage.getMessage();
        this.createdAt = chatMessage.getCreatedAt();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }

    public UserDto getAuthor() {
        return author;
    }

    public void setAuthor(UserDto author) {
        this.author = author;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

