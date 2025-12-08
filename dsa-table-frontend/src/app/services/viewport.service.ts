import { Injectable } from '@angular/core';

export interface ViewportState {
  zoomLevel: number;
  panX: number;
  panY: number;
}

@Injectable({
  providedIn: 'root'
})
export class ViewportService {
  private readonly MIN_ZOOM = 0.5;
  private readonly MAX_ZOOM = 3;
  private readonly ZOOM_SENSITIVITY = 0.1;

  private state: ViewportState = {
    zoomLevel: 1,
    panX: 0,
    panY: 0
  };

  get zoomLevel(): number {
    return this.state.zoomLevel;
  }

  get panX(): number {
    return this.state.panX;
  }

  get panY(): number {
    return this.state.panY;
  }

  getState(): ViewportState {
    return { ...this.state };
  }

  setState(state: ViewportState): void {
    this.state = { ...state };
  }

  centerMap(viewportWidth: number, viewportHeight: number, canvasWidth: number, canvasHeight: number): void {
    this.state.panX = (viewportWidth - canvasWidth * this.state.zoomLevel) / 2;
    this.state.panY = (viewportHeight - canvasHeight * this.state.zoomLevel) / 2;
  }

  handleWheel(event: WheelEvent, viewportWidth: number, viewportHeight: number, canvasWidth: number, canvasHeight: number): void {
    event.preventDefault();
    
    const delta = event.deltaY > 0 ? -this.ZOOM_SENSITIVITY : this.ZOOM_SENSITIVITY;
    const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.state.zoomLevel + delta));
    
    if (newZoom === this.state.zoomLevel) return;
    
    // Get mouse position relative to viewport
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate zoom point in canvas coordinates
    const canvasX = (mouseX - this.state.panX) / this.state.zoomLevel;
    const canvasY = (mouseY - this.state.panY) / this.state.zoomLevel;
    
    // Update zoom
    this.state.zoomLevel = newZoom;
    
    // Adjust pan to zoom towards mouse position
    this.state.panX = mouseX - canvasX * this.state.zoomLevel;
    this.state.panY = mouseY - canvasY * this.state.zoomLevel;
    
    // Keep map within bounds
    this.constrainPan(viewportWidth, viewportHeight, canvasWidth, canvasHeight);
  }

  startPan(startX: number, startY: number): { panStartX: number; panStartY: number; panStartOffsetX: number; panStartOffsetY: number } {
    return {
      panStartX: startX,
      panStartY: startY,
      panStartOffsetX: this.state.panX,
      panStartOffsetY: this.state.panY
    };
  }

  updatePan(panStart: { panStartX: number; panStartY: number; panStartOffsetX: number; panStartOffsetY: number }, currentX: number, currentY: number, viewportWidth: number, viewportHeight: number, canvasWidth: number, canvasHeight: number): void {
    const deltaX = currentX - panStart.panStartX;
    const deltaY = currentY - panStart.panStartY;
    
    this.state.panX = panStart.panStartOffsetX + deltaX;
    this.state.panY = panStart.panStartOffsetY + deltaY;
    
    this.constrainPan(viewportWidth, viewportHeight, canvasWidth, canvasHeight);
  }

  getTransform(): string {
    return `translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoomLevel})`;
  }

  private constrainPan(viewportWidth: number, viewportHeight: number, canvasWidth: number, canvasHeight: number): void {
    const scaledWidth = canvasWidth * this.state.zoomLevel;
    const scaledHeight = canvasHeight * this.state.zoomLevel;
    
    // Constrain pan to keep map within viewport (allow some overflow for better UX)
    const maxPanX = viewportWidth * 0.5;
    const maxPanY = viewportHeight * 0.5;
    const minPanX = viewportWidth - scaledWidth - viewportWidth * 0.5;
    const minPanY = viewportHeight - scaledHeight - viewportHeight * 0.5;
    
    this.state.panX = Math.max(minPanX, Math.min(maxPanX, this.state.panX));
    this.state.panY = Math.max(minPanY, Math.min(maxPanY, this.state.panY));
  }
}
