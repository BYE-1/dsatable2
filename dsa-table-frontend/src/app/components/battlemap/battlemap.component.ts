import { Component, Input, HostListener, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameSessionService } from '../../services/game-session.service';
import { Battlemap, BattlemapToken } from '../../models/battlemap.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-battlemap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './battlemap.component.html',
  styleUrl: './battlemap.component.scss'
})
export class BattlemapComponent implements AfterViewInit, OnDestroy {
  @Input() sessionId?: number;
  @Input() mapImageUrl?: string; // For future use with actual battlemaps
  
  private battlemapSubscription?: Subscription;
  private pollingSubscription?: Subscription;
  private saveTimeout?: any;
  private isSaving: boolean = false;
  private lastSavedTokenHash: string = '';
  
  @ViewChild('mapViewport', { static: false }) mapViewport!: ElementRef<HTMLDivElement>;
  @ViewChild('mapCanvas', { static: false }) mapCanvas!: ElementRef<HTMLDivElement>;
  
  // Grid configuration
  gridSize: number = 10; // 10x10 grid (configurable later)
  
  // Pan and zoom state
  zoomLevel: number = 1;
  panX: number = 0;
  panY: number = 0;
  
  // Panning state
  isPanning: boolean = false;
  panStartX: number = 0;
  panStartY: number = 0;
  panStartOffsetX: number = 0;
  panStartOffsetY: number = 0;
  
  // Token placement state
  isAddingToken: boolean = false;
  tokens: Array<{ id: number; x: number; y: number; isGmOnly: boolean }> = [];
  private nextTokenId: number = 1;
  
  constructor(private gameSessionService: GameSessionService) {}
  
  // Token dragging state
  isDraggingToken: boolean = false;
  draggedTokenId: number | null = null;
  dragStartX: number = 0;
  dragStartY: number = 0;
  dragStartTokenX: number = 0;
  dragStartTokenY: number = 0;
  
  // Zoom constraints
  readonly MIN_ZOOM: number = 0.5;
  readonly MAX_ZOOM: number = 3;
  readonly ZOOM_SENSITIVITY: number = 0.1;
  
  ngAfterViewInit(): void {
    // Center the map initially
    setTimeout(() => {
      this.centerMap();
      this.setupEventListeners();
      this.loadBattlemap();
      this.startPolling();
    }, 0);
  }
  
  ngOnDestroy(): void {
    if (this.battlemapSubscription) {
      this.battlemapSubscription.unsubscribe();
    }
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  }
  
  // Load battlemap data from backend
  loadBattlemap(): void {
    if (!this.sessionId) return;
    
    this.gameSessionService.getBattlemap(this.sessionId).subscribe({
      next: (battlemap) => {
        if (battlemap) {
          this.applyBattlemapData(battlemap, false);
        }
      },
      error: (error) => {
        console.error('Error loading battlemap:', error);
      }
    });
  }
  
  // Apply battlemap data (with option to skip if currently saving)
  applyBattlemapData(battlemap: Battlemap, skipIfSaving: boolean = true): void {
    if (skipIfSaving && this.isSaving) {
      return; // Don't overwrite local changes while saving
    }
    
    // Load battlemap configuration
    if (battlemap.gridSize !== undefined) {
      this.gridSize = battlemap.gridSize;
    }
    if (battlemap.canvasWidth && this.mapCanvas) {
      this.mapCanvas.nativeElement.style.width = battlemap.canvasWidth + 'px';
    }
    if (battlemap.canvasHeight && this.mapCanvas) {
      this.mapCanvas.nativeElement.style.height = battlemap.canvasHeight + 'px';
    }
    if (battlemap.mapImageUrl) {
      this.mapImageUrl = battlemap.mapImageUrl;
    }
    
    // View state (zoom/pan) is local only - not synchronized
    // No need to load from backend since they're not stored
    
    // Update tokens only if they've changed
    const tokenHash = this.getTokenHash(battlemap.tokens || []);
    if (tokenHash !== this.lastSavedTokenHash) {
      if (battlemap.tokens && battlemap.tokens.length > 0) {
        this.tokens = battlemap.tokens.map(token => ({
          id: token.tokenId,
          x: token.x,
          y: token.y,
          isGmOnly: token.isGmOnly || false
        }));
        // Find the highest token ID to set nextTokenId
        const maxId = Math.max(...this.tokens.map(t => t.id), 0);
        this.nextTokenId = maxId + 1;
      } else {
        this.tokens = [];
      }
      this.lastSavedTokenHash = tokenHash;
    }
    
    // Re-center map after loading (only on initial load)
    if (!skipIfSaving) {
      setTimeout(() => this.centerMap(), 100);
    }
  }
  
  // Get a hash of tokens for comparison
  getTokenHash(tokens: BattlemapToken[]): string {
    return tokens
      .map(t => `${t.tokenId}:${t.x.toFixed(2)}:${t.y.toFixed(2)}:${t.isGmOnly}`)
      .sort()
      .join('|');
  }
  
  // Start polling for battlemap updates
  startPolling(): void {
    if (!this.sessionId) return;
    
    this.pollingSubscription = this.gameSessionService.pollBattlemap(this.sessionId, 2000).subscribe({
      next: (battlemap) => {
        if (battlemap) {
          this.applyBattlemapData(battlemap, true);
        }
      },
      error: (error) => {
        console.error('Error polling battlemap:', error);
      }
    });
  }
  
  // Save battlemap data to backend (debounced)
  saveBattlemap(): void {
    if (!this.sessionId) return;
    
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Debounce saves to avoid too many API calls
    this.saveTimeout = setTimeout(() => {
      const battlemap: Battlemap = {
        gridSize: this.gridSize,
        canvasWidth: this.mapCanvas?.nativeElement.offsetWidth || 512,
        canvasHeight: this.mapCanvas?.nativeElement.offsetHeight || 512,
        mapImageUrl: this.mapImageUrl,
        // zoomLevel, panX, panY are local only - not synchronized
        tokens: this.tokens.map(token => ({
          tokenId: token.id,
          x: token.x,
          y: token.y,
          isGmOnly: token.isGmOnly
        }))
      };
      
      const tokenHash = this.getTokenHash(battlemap.tokens || []);
      this.lastSavedTokenHash = tokenHash;
      this.isSaving = true;
      
      this.gameSessionService.updateBattlemap(this.sessionId!, battlemap).subscribe({
        next: () => {
          // Successfully saved
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error saving battlemap:', error);
          this.isSaving = false;
        }
      });
    }, 300); // 300ms debounce (reduced for faster sync)
  }
  
  // Setup event listeners on the viewport element
  setupEventListeners(): void {
    if (!this.mapViewport) return;
    
    const viewport = this.mapViewport.nativeElement;
    
    // Mouse down for panning and token placement
    viewport.addEventListener('mousedown', (e: MouseEvent) => this.onMouseDown(e));
    
    // Mouse move for panning and token cursor
    viewport.addEventListener('mousemove', (e: MouseEvent) => {
      this.onMouseMove(e);
      this.updateTokenCursor(e);
    });
    
    // Mouse up
    viewport.addEventListener('mouseup', (e: MouseEvent) => this.onMouseUp(e));
    
    // Mouse leave
    viewport.addEventListener('mouseleave', (e: MouseEvent) => {
      this.onMouseLeave(e);
      this.hideTokenCursor();
    });
    
    // Wheel for zooming
    viewport.addEventListener('wheel', (e: WheelEvent) => this.onWheel(e), { passive: false });
    
    // Prevent context menu on right click
    viewport.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });
    
    // Document-level listeners for token dragging (to handle mouse outside viewport)
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isDraggingToken) {
        this.updateTokenDrag(e);
      }
    });
    
    document.addEventListener('mouseup', (e: MouseEvent) => {
      if (this.isDraggingToken && e.button === 0) {
        this.finishTokenDrag(e);
      }
    });
  }
  
  // Update token cursor position (snapped to grid)
  updateTokenCursor(event: MouseEvent): void {
    if (!this.isAddingToken || !this.mapViewport || !this.mapCanvas) {
      this.hideTokenCursor();
      return;
    }
    
    const viewport = this.mapViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();
    const cursor = viewport.querySelector('.token-cursor') as HTMLElement;
    
    if (!cursor) return;
    
    // Get mouse position relative to viewport
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate position on canvas (accounting for pan and zoom)
    const canvasX = (mouseX - this.panX) / this.zoomLevel;
    const canvasY = (mouseY - this.panY) / this.zoomLevel;
    
    // Snap to grid cell center (using separate width/height for X/Y)
    const snappedX = this.snapToGrid(canvasX, false);
    const snappedY = this.snapToGrid(canvasY, true);
    
    // Convert back to viewport coordinates for display
    const viewportX = snappedX * this.zoomLevel + this.panX;
    const viewportY = snappedY * this.zoomLevel + this.panY;
    
    cursor.style.display = 'block';
    cursor.style.left = viewportX + 'px';
    cursor.style.top = viewportY + 'px';
  }
  
  // Hide token cursor
  hideTokenCursor(): void {
    if (!this.mapViewport) return;
    
    const viewport = this.mapViewport.nativeElement;
    const cursor = viewport.querySelector('.token-cursor') as HTMLElement;
    
    if (cursor && !this.isAddingToken) {
      cursor.style.display = 'none';
    }
  }
  
  // Placeholder - using a data URI for a simple green rectangle
  get placeholderImageUrl(): string {
    // Return a simple SVG as data URI with green background
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzRmN2MyYSIvPjwvc3ZnPg==';
  }
  
  // Get grid cell size as percentage
  get gridCellSizePercent(): number {
    return 100 / this.gridSize;
  }
  
  // Get transform style for map canvas
  get mapTransform(): string {
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
  }
  
  // Center the map in the viewport
  centerMap(): void {
    if (!this.mapViewport || !this.mapCanvas) return;
    
    const viewport = this.mapViewport.nativeElement;
    const canvas = this.mapCanvas.nativeElement;
    
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    
    // Center the canvas
    this.panX = (viewportWidth - canvasWidth * this.zoomLevel) / 2;
    this.panY = (viewportHeight - canvasHeight * this.zoomLevel) / 2;
  }
  
  // Handle mouse button down
  onMouseDown(event: MouseEvent): void {
    if (event.button === 2) { // Right mouse button - panning
      event.preventDefault();
      this.isPanning = true;
      this.panStartX = event.clientX;
      this.panStartY = event.clientY;
      this.panStartOffsetX = this.panX;
      this.panStartOffsetY = this.panY;
      
      if (this.mapViewport) {
        this.mapViewport.nativeElement.style.cursor = 'grabbing';
      }
    } else if (event.button === 0 && this.isAddingToken) { // Left mouse button - place token
      event.preventDefault();
      this.placeToken(event);
    }
    // Token dragging is handled separately via token mousedown event
  }
  
  // Handle mouse move for panning and token dragging
  onMouseMove(event: MouseEvent): void {
    if (this.isPanning) {
      const deltaX = event.clientX - this.panStartX;
      const deltaY = event.clientY - this.panStartY;
      
      this.panX = this.panStartOffsetX + deltaX;
      this.panY = this.panStartOffsetY + deltaY;
      
      // Pan state is local only - not saved to backend
    } else if (this.isDraggingToken && this.draggedTokenId !== null) {
      this.updateTokenDrag(event);
    }
  }
  
  // Get grid cell size in pixels (average for circular tokens)
  getGridCellSize(): number {
    if (!this.mapCanvas) return 0;
    const canvas = this.mapCanvas.nativeElement;
    // Use average of width and height to get a size that fits in cells
    const cellSize = (canvas.offsetWidth + canvas.offsetHeight) / (2 * this.gridSize);
    return cellSize;
  }
  
  // Get grid cell width in pixels
  getGridCellWidth(): number {
    if (!this.mapCanvas) return 0;
    const canvas = this.mapCanvas.nativeElement;
    return canvas.offsetWidth / this.gridSize;
  }
  
  // Get grid cell height in pixels
  getGridCellHeight(): number {
    if (!this.mapCanvas) return 0;
    const canvas = this.mapCanvas.nativeElement;
    return canvas.offsetHeight / this.gridSize;
  }
  
  // Snap a coordinate to the center of the nearest grid cell
  snapToGrid(coord: number, isY: boolean = false): number {
    const cellSize = isY ? this.getGridCellHeight() : this.getGridCellWidth();
    // Find which cell the coordinate is in
    const cellIndex = Math.floor(coord / cellSize);
    // Calculate the center of that cell
    const cellCenter = cellIndex * cellSize + cellSize / 2;
    
    // Check if we're closer to the next cell's center
    if (cellIndex >= 0) {
      const nextCellCenter = (cellIndex + 1) * cellSize + cellSize / 2;
      const distanceToCurrent = Math.abs(coord - cellCenter);
      const distanceToNext = Math.abs(coord - nextCellCenter);
      
      // Return the center of the nearest cell
      return distanceToNext < distanceToCurrent ? nextCellCenter : cellCenter;
    }
    
    return cellCenter;
  }
  
  // Place a token at the clicked position (snapped to grid)
  placeToken(event: MouseEvent): void {
    if (!this.mapViewport || !this.mapCanvas) return;
    
    const viewport = this.mapViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();
    
    // Get mouse position relative to viewport
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate position on canvas (accounting for pan and zoom)
    const canvasX = (mouseX - this.panX) / this.zoomLevel;
    const canvasY = (mouseY - this.panY) / this.zoomLevel;
    
    // Snap to grid cell center (using separate width/height for X/Y)
    const snappedX = this.snapToGrid(canvasX, false);
    const snappedY = this.snapToGrid(canvasY, true);
    
    // Add token to the list (public tokens for now)
    this.tokens.push({
      id: this.nextTokenId++,
      x: snappedX,
      y: snappedY,
      isGmOnly: false
    });
    
    // Save to backend
    this.saveBattlemap();
    
    // Exit token placement mode and restore normal cursor
    this.isAddingToken = false;
    if (this.mapViewport) {
      this.mapViewport.nativeElement.style.cursor = 'grab';
      this.mapViewport.nativeElement.classList.remove('token-placement-mode');
    }
    this.hideTokenCursor();
  }
  
  // Handle mouse up
  onMouseUp(event: MouseEvent): void {
    if (event.button === 2) { // Right mouse button
      this.isPanning = false;
      
      if (this.mapViewport) {
        this.mapViewport.nativeElement.style.cursor = 'grab';
      }
    } else if (event.button === 0 && this.isDraggingToken) {
      // Finish token drag and snap to grid
      this.finishTokenDrag(event);
    }
  }
  
  // Handle mouse leave (stop panning/dragging if mouse leaves viewport)
  onMouseLeave(event: MouseEvent): void {
    this.isPanning = false;
    
    if (this.isDraggingToken) {
      // Finish drag if mouse leaves viewport
      this.finishTokenDrag(event);
    }
    
    if (this.mapViewport) {
      this.mapViewport.nativeElement.style.cursor = 'grab';
    }
  }
  
  // Handle wheel zoom
  onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    if (!this.mapViewport || !this.mapCanvas) return;
    
    const viewport = this.mapViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();
    
    // Get mouse position relative to viewport
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate zoom delta
    const zoomDelta = event.deltaY > 0 ? -this.ZOOM_SENSITIVITY : this.ZOOM_SENSITIVITY;
    const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.zoomLevel + zoomDelta));
    
    if (newZoom === this.zoomLevel) return;
    
    // Calculate point in canvas before zoom
    const canvasX = (mouseX - this.panX) / this.zoomLevel;
    const canvasY = (mouseY - this.panY) / this.zoomLevel;
    
    // Apply zoom
    this.zoomLevel = newZoom;
    
    // Adjust pan to zoom towards mouse position
    this.panX = mouseX - canvasX * this.zoomLevel;
    this.panY = mouseY - canvasY * this.zoomLevel;
    
    // Zoom and pan are local only - not saved to backend
  }
  
  // Menu actions
  onAddToken(): void {
    this.isAddingToken = !this.isAddingToken;
    
    // Update cursor
    if (this.mapViewport) {
      if (this.isAddingToken) {
        this.mapViewport.nativeElement.style.cursor = 'none';
        this.mapViewport.nativeElement.classList.add('token-placement-mode');
      } else {
        this.mapViewport.nativeElement.style.cursor = 'grab';
        this.mapViewport.nativeElement.classList.remove('token-placement-mode');
      }
    }
  }
  
  onConfigureSize(): void {
    // TODO: Implement size configuration dialog
    console.log('Configure size clicked');
    // For now, show a prompt to change grid size
    const newSize = prompt(`Enter grid size (current: ${this.gridSize}x${this.gridSize}):`, this.gridSize.toString());
    if (newSize !== null) {
      const size = parseInt(newSize, 10);
      if (!isNaN(size) && size > 0 && size <= 50) {
        this.gridSize = size;
        this.saveBattlemap();
      }
    }
  }
  
  // Start dragging a token
  onTokenMouseDown(event: MouseEvent, tokenId: number): void {
    if (event.button !== 0 || this.isAddingToken) return; // Only left click, and not in placement mode
    
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.mapViewport || !this.mapCanvas) return;
    
    const viewport = this.mapViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();
    
    // Get mouse position relative to viewport
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Find the token
    const token = this.tokens.find(t => t.id === tokenId);
    if (!token) return;
    
    // Start dragging
    this.isDraggingToken = true;
    this.draggedTokenId = tokenId;
    this.dragStartX = mouseX;
    this.dragStartY = mouseY;
    this.dragStartTokenX = token.x;
    this.dragStartTokenY = token.y;
    
    // Change cursor
    if (this.mapViewport) {
      this.mapViewport.nativeElement.style.cursor = 'grabbing';
    }
  }
  
  // Update token position during drag
  updateTokenDrag(event: MouseEvent): void {
    if (!this.mapViewport || !this.mapCanvas || this.draggedTokenId === null) return;
    
    const viewport = this.mapViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();
    
    // Get mouse position relative to viewport
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate delta in viewport coordinates
    const deltaX = mouseX - this.dragStartX;
    const deltaY = mouseY - this.dragStartY;
    
    // Convert delta to canvas coordinates
    const canvasDeltaX = deltaX / this.zoomLevel;
    const canvasDeltaY = deltaY / this.zoomLevel;
    
    // Update token position (temporarily, will snap on drop)
    const token = this.tokens.find(t => t.id === this.draggedTokenId);
    if (token) {
      token.x = this.dragStartTokenX + canvasDeltaX;
      token.y = this.dragStartTokenY + canvasDeltaY;
    }
  }
  
  // Finish dragging and snap to grid
  finishTokenDrag(event: MouseEvent): void {
    if (this.draggedTokenId === null) return;
    
    const token = this.tokens.find(t => t.id === this.draggedTokenId);
    if (token) {
      // Snap to grid
      token.x = this.snapToGrid(token.x, false);
      token.y = this.snapToGrid(token.y, true);
      
      // Save to backend
      this.saveBattlemap();
    }
    
    // Reset drag state
    this.isDraggingToken = false;
    this.draggedTokenId = null;
    
    // Restore cursor
    if (this.mapViewport) {
      this.mapViewport.nativeElement.style.cursor = 'grab';
    }
  }
}
