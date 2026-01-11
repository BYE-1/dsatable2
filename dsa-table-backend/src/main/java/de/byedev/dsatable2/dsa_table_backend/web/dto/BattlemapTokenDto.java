package de.byedev.dsatable2.dsa_table_backend.web.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class BattlemapTokenDto {
    private Long id;
    @JsonProperty("tid")
    private Long tokenId;
    private Double x;
    private Double y;
    @JsonProperty("gm")
    private Boolean isGmOnly;
    private String color;
    @JsonProperty("url")
    private String avatarUrl;
    @JsonProperty("bc")
    private String borderColor;
    private String name;
    private String playerName; // Used by frontend, mapped to characterId in backend
    private Long characterId; // Used by backend, mapped from playerName
    
    // Environment object properties (alternative to avatarUrl for reconstruction)
    @JsonProperty("et")
    private String envType;
    @JsonProperty("ec")
    private String envColor;
    @JsonProperty("es")
    private Integer envSize;

    public BattlemapTokenDto() {
    }

    public BattlemapTokenDto(Long id, Long tokenId, Double x, Double y, Boolean isGmOnly) {
        this.id = id;
        this.tokenId = tokenId;
        this.x = x;
        this.y = y;
        this.isGmOnly = isGmOnly;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTokenId() {
        return tokenId;
    }

    public void setTokenId(Long tokenId) {
        this.tokenId = tokenId;
    }

    public Double getX() {
        return x;
    }

    public void setX(Double x) {
        this.x = x;
    }

    public Double getY() {
        return y;
    }

    public void setY(Double y) {
        this.y = y;
    }

    public Boolean getIsGmOnly() {
        return isGmOnly;
    }

    public void setIsGmOnly(Boolean isGmOnly) {
        this.isGmOnly = isGmOnly;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getBorderColor() {
        return borderColor;
    }

    public void setBorderColor(String borderColor) {
        this.borderColor = borderColor;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPlayerName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }

    public Long getCharacterId() {
        return characterId;
    }

    public void setCharacterId(Long characterId) {
        this.characterId = characterId;
    }

    public String getEnvType() {
        return envType;
    }

    public void setEnvType(String envType) {
        this.envType = envType;
    }

    public String getEnvColor() {
        return envColor;
    }

    public void setEnvColor(String envColor) {
        this.envColor = envColor;
    }

    public Integer getEnvSize() {
        return envSize;
    }

    public void setEnvSize(Integer envSize) {
        this.envSize = envSize;
    }
}
