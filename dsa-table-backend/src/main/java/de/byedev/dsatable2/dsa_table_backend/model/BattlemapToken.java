package de.byedev.dsatable2.dsa_table_backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "battlemap_tokens")
public class BattlemapToken {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "battlemap_token_seq")
    @SequenceGenerator(name = "battlemap_token_seq", sequenceName = "battlemap_token_seq", allocationSize = 50)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "battlemap_id", nullable = false)
    private Battlemap battlemap;

    @Column(name = "token_id")
    private Long tokenId;

    @Column(name = "x_position")
    private Double x;

    @Column(name = "y_position")
    private Double y;

    @Column(name = "is_gm_only")
    private Boolean isGmOnly = false;

    @Column(name = "color")
    private String color;

    @Column(name = "avatar_url", length = 1000)
    private String avatarUrl;

    @Column(name = "border_color")
    private String borderColor;

    @Column(name = "name")
    private String name;

    public BattlemapToken() {
    }

    public BattlemapToken(Battlemap battlemap, Long tokenId, Double x, Double y, Boolean isGmOnly) {
        this.battlemap = battlemap;
        this.tokenId = tokenId;
        this.x = x;
        this.y = y;
        this.isGmOnly = isGmOnly;
    }

    public Long getId() {
        return id;
    }

    public Battlemap getBattlemap() {
        return battlemap;
    }

    public void setBattlemap(Battlemap battlemap) {
        this.battlemap = battlemap;
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
