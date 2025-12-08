package de.byedev.dsatable2.dsa_table_backend.web.dto;

public class BattlemapTokenDto {
    private Long id;
    private Long tokenId;
    private Double x;
    private Double y;
    private Boolean isGmOnly;
    private String color;
    private String avatarUrl;
    private String borderColor;
    private String name;

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
}
