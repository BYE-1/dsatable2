import { Injectable } from '@angular/core';
import { FogRevealedArea } from '../models/battlemap.model';

export interface GridCell {
  gridX: number;
  gridY: number;
}

@Injectable({
  providedIn: 'root'
})
export class FogOfWarService {
  private revealedCells: Set<string> = new Set();
  fogMode: 'add' | 'remove' = 'add';
  isPainting: boolean = false;
  lastPaintedCell: string | null = null;

  setFogAreas(areas: FogRevealedArea[]): void {
    this.revealedCells.clear();
    areas.forEach(area => {
      const key = this.getCellKey(area.gridX, area.gridY);
      this.revealedCells.add(key);
    });
  }

  getFogAreas(): FogRevealedArea[] {
    const areas: FogRevealedArea[] = [];
    this.revealedCells.forEach(key => {
      const [gridX, gridY] = this.parseCellKey(key);
      areas.push({ gridX, gridY });
    });
    return areas;
  }

  getRevealedCells(): Set<string> {
    return new Set(this.revealedCells);
  }

  isCellRevealed(gridX: number, gridY: number): boolean {
    return this.revealedCells.has(this.getCellKey(gridX, gridY));
  }

  setFogMode(mode: 'add' | 'remove'): void {
    this.fogMode = mode;
  }

  startPainting(): void {
    this.isPainting = true;
    this.lastPaintedCell = null;
  }

  stopPainting(): void {
    this.isPainting = false;
    this.lastPaintedCell = null;
  }

  paintCell(gridX: number, gridY: number): void {
    if (!this.isPainting) return;

    const cellKey = this.getCellKey(gridX, gridY);
    
    if (this.lastPaintedCell === cellKey) return;
    
    this.lastPaintedCell = cellKey;

    if (this.fogMode === 'add') {
      this.revealedCells.delete(cellKey);
    } else {
      this.revealedCells.add(cellKey);
    }
  }

  private getCellKey(gridX: number, gridY: number): string {
    return `${gridX},${gridY}`;
  }

  private parseCellKey(key: string): [number, number] {
    const [x, y] = key.split(',').map(Number);
    return [x, y];
  }
}
