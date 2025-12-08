package de.byedev.dsatable2.dsa_table_backend.web.dto;

import de.byedev.dsatable2.dsa_table_backend.model.FogRevealedArea;

public class FogRevealedAreaDto {
    private Integer gridX;
    private Integer gridY;

    public FogRevealedAreaDto() {
    }

    public FogRevealedAreaDto(Integer gridX, Integer gridY) {
        this.gridX = gridX;
        this.gridY = gridY;
    }

    public FogRevealedAreaDto(FogRevealedArea area) {
        this.gridX = area.getGridX();
        this.gridY = area.getGridY();
    }

    public Integer getGridX() {
        return gridX;
    }

    public void setGridX(Integer gridX) {
        this.gridX = gridX;
    }

    public Integer getGridY() {
        return gridY;
    }

    public void setGridY(Integer gridY) {
        this.gridY = gridY;
    }
}
