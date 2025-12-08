package de.byedev.dsatable2.dsa_table_backend.model;

import jakarta.persistence.Embeddable;

@Embeddable
public class FogRevealedArea {
    private Integer gridX;
    private Integer gridY;

    public FogRevealedArea() {
    }

    public FogRevealedArea(Integer gridX, Integer gridY) {
        this.gridX = gridX;
        this.gridY = gridY;
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
