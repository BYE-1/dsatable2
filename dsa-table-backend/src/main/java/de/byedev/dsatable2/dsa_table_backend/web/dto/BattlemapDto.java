package de.byedev.dsatable2.dsa_table_backend.web.dto;

import de.byedev.dsatable2.dsa_table_backend.model.Battlemap;
import de.byedev.dsatable2.dsa_table_backend.model.BattlemapToken;

import java.util.List;
import java.util.stream.Collectors;

public class BattlemapDto {
    private Long id;
    private Long sessionId;
    private Integer gridSize;
    private Integer canvasWidth;
    private Integer canvasHeight;
    private String mapImageUrl;
    private List<BattlemapTokenDto> tokens;

    public BattlemapDto() {
    }

    public BattlemapDto(Battlemap battlemap) {
        this.id = battlemap.getId();
        this.sessionId = battlemap.getSessionId();
        this.gridSize = battlemap.getGridSize();
        this.canvasWidth = battlemap.getCanvasWidth();
        this.canvasHeight = battlemap.getCanvasHeight();
        this.mapImageUrl = battlemap.getMapImageUrl();
        if (battlemap.getTokens() != null) {
            this.tokens = battlemap.getTokens().stream()
                    .map(token -> new BattlemapTokenDto(
                            token.getId(),
                            token.getTokenId(),
                            token.getX(),
                            token.getY(),
                            token.getIsGmOnly()
                    ))
                    .collect(Collectors.toList());
        }
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

    public List<BattlemapTokenDto> getTokens() {
        return tokens;
    }

    public void setTokens(List<BattlemapTokenDto> tokens) {
        this.tokens = tokens;
    }
}
