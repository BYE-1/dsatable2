package de.byedev.dsatable2.dsa_table_backend.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "battlemaps")
public class Battlemap {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "battlemap_seq")
    @SequenceGenerator(name = "battlemap_seq", sequenceName = "battlemap_seq", allocationSize = 50)
    private Long id;

    @Column(name = "session_id", unique = true, nullable = false)
    private Long sessionId;

    @Column(name = "grid_size")
    private Integer gridSize = 10;

    @Column(name = "canvas_width")
    private Integer canvasWidth = 512;

    @Column(name = "canvas_height")
    private Integer canvasHeight = 512;

    @Column(name = "map_image_url", length = 2048)
    private String mapImageUrl;

    @OneToMany(mappedBy = "battlemap", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BattlemapToken> tokens = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "battlemap_fog_revealed_areas", joinColumns = @JoinColumn(name = "battlemap_id"))
    private List<FogRevealedArea> fogRevealedAreas = new ArrayList<>();

    public Battlemap() {
    }

    public Battlemap(Long sessionId) {
        this.sessionId = sessionId;
    }

    public Long getId() {
        return id;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }

    public Integer getGridSize() {
        return gridSize;
    }

    public void setGridSize(Integer gridSize) {
        this.gridSize = gridSize;
    }

    public Integer getCanvasWidth() {
        return canvasWidth;
    }

    public void setCanvasWidth(Integer canvasWidth) {
        this.canvasWidth = canvasWidth;
    }

    public Integer getCanvasHeight() {
        return canvasHeight;
    }

    public void setCanvasHeight(Integer canvasHeight) {
        this.canvasHeight = canvasHeight;
    }

    public String getMapImageUrl() {
        return mapImageUrl;
    }

    public void setMapImageUrl(String mapImageUrl) {
        this.mapImageUrl = mapImageUrl;
    }

    public List<BattlemapToken> getTokens() {
        return tokens;
    }

    public void setTokens(List<BattlemapToken> tokens) {
        this.tokens = tokens;
    }

    public List<FogRevealedArea> getFogRevealedAreas() {
        return fogRevealedAreas;
    }

    public void setFogRevealedAreas(List<FogRevealedArea> fogRevealedAreas) {
        this.fogRevealedAreas = fogRevealedAreas;
    }
}
