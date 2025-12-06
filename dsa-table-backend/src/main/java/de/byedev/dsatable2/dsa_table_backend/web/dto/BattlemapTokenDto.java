package de.byedev.dsatable2.dsa_table_backend.web.dto;

public class BattlemapTokenDto {
    private Long id;
    private Long tokenId;
    private Double x;
    private Double y;
    private Boolean isGmOnly;

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
}
