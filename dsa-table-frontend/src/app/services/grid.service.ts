import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GridService {
  gridSize: number = 10; // 10x10 grid

  setGridSize(size: number): void {
    this.gridSize = size;
  }

  getGridCellSize(canvasWidth?: number, canvasHeight?: number): number {
    // Grid cell size in pixels (average for circular tokens) - in base canvas coordinates
    if (canvasWidth && canvasHeight) {
      return (canvasWidth + canvasHeight) / (2 * this.gridSize);
    }
    return 100 / this.gridSize;
  }

  getTokenSize(canvasWidth?: number, canvasHeight?: number): number {
    // Token size (smaller than grid cell to fit better) - in base canvas coordinates
    return this.getGridCellSize(canvasWidth, canvasHeight) * 0.75; // 75% of grid cell size
  }

  getImageScaleFactor(): number {
    // Scale factor for rendering images at higher resolution (2x for better quality)
    return 2;
  }

  getTokenImageSize(canvasWidth?: number, canvasHeight?: number): number {
    // Pixel size for the token image (rendered at higher resolution, then scaled down)
    return this.getTokenSize(canvasWidth, canvasHeight) * this.getImageScaleFactor();
  }

  getGridCellWidth(canvasWidth?: number): number {
    if (canvasWidth) {
      return canvasWidth / this.gridSize;
    }
    return 100 / this.gridSize;
  }

  getGridCellHeight(canvasHeight?: number): number {
    if (canvasHeight) {
      return canvasHeight / this.gridSize;
    }
    return 100 / this.gridSize;
  }

  /**
   * Snap a coordinate to the center of the nearest grid cell
   * @param coord Coordinate in base canvas coordinates (not zoomed)
   * @param isY Whether this is a Y coordinate (for different cell height if needed)
   * @param canvasWidth Canvas width for X coordinate snapping
   * @param canvasHeight Canvas height for Y coordinate snapping
   * @returns Snapped coordinate
   */
  snapToGrid(coord: number, isY: boolean = false, canvasWidth?: number, canvasHeight?: number): number {
    const cellSize = isY ? this.getGridCellHeight(canvasHeight) : this.getGridCellWidth(canvasWidth);
    
    // Find which cell the coordinate is in (can be negative for coordinates < 0)
    const cellIndex = Math.floor(coord / cellSize);
    
    // Calculate the center of the current cell
    const currentCellCenter = cellIndex * cellSize + cellSize / 2;
    
    // Calculate the center of the next cell
    const nextCellCenter = (cellIndex + 1) * cellSize + cellSize / 2;
    
    // Calculate the center of the previous cell (for negative coordinates)
    const prevCellCenter = (cellIndex - 1) * cellSize + cellSize / 2;
    
    // Calculate distances to all three possible centers
    const distToCurrent = Math.abs(coord - currentCellCenter);
    const distToNext = Math.abs(coord - nextCellCenter);
    const distToPrev = Math.abs(coord - prevCellCenter);
    
    // Return the center of the nearest cell
    if (distToPrev < distToCurrent && distToPrev < distToNext) {
      return prevCellCenter;
    } else if (distToNext < distToCurrent) {
      return nextCellCenter;
    } else {
      return currentCellCenter;
    }
  }

  /**
   * Convert viewport coordinates to canvas coordinates
   */
  viewportToCanvas(viewportX: number, viewportY: number, panX: number, panY: number, zoomLevel: number): { x: number; y: number } {
    return {
      x: (viewportX - panX) / zoomLevel,
      y: (viewportY - panY) / zoomLevel
    };
  }

  /**
   * Convert canvas coordinates to viewport coordinates
   */
  canvasToViewport(canvasX: number, canvasY: number, panX: number, panY: number, zoomLevel: number): { x: number; y: number } {
    return {
      x: panX + canvasX * zoomLevel,
      y: panY + canvasY * zoomLevel
    };
  }

  getGridCellSizePercent(): number {
    return 100 / this.gridSize;
  }
}
