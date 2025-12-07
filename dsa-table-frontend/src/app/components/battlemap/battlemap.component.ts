import { Component, Input, HostListener, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameSessionService } from '../../services/game-session.service';
import { CharacterService } from '../../services/character.service';
import { Battlemap, BattlemapToken } from '../../models/battlemap.model';
import { Character } from '../../models/character.model';
import { environment } from '../../../environments/environment';
import { Subscription, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
  
  // Track if map has been initialized (to prevent recentering after user interaction)
  private mapInitialized: boolean = false;
  
  // Base canvas dimensions (without zoom) - exposed for template binding
  baseCanvasWidth: number = 512;
  baseCanvasHeight: number = 512;
  
  // Panning state
  isPanning: boolean = false;
  panStartX: number = 0;
  panStartY: number = 0;
  panStartOffsetX: number = 0;
  panStartOffsetY: number = 0;
  
  // Token placement state
  isAddingToken: boolean = false;
  tokens: Array<{ id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; characterId?: number }> = [];
  private nextTokenId: number = 1;
  
  constructor(
    private gameSessionService: GameSessionService,
    private characterService: CharacterService
  ) {}
  
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
      // Initialize canvas size to match base dimensions
      if (this.mapCanvas) {
        this.mapCanvas.nativeElement.style.width = this.baseCanvasWidth + 'px';
        this.mapCanvas.nativeElement.style.height = this.baseCanvasHeight + 'px';
      }
      
      if (!this.mapInitialized) {
        this.centerMap();
        this.mapInitialized = true;
      }
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
  // IMPORTANT: Zoom and pan are NEVER loaded from backend - they are purely local view state
  applyBattlemapData(battlemap: Battlemap, skipIfSaving: boolean = true): void {
    if (skipIfSaving && this.isSaving) {
      return; // Don't overwrite local changes while saving
    }
    
    // Store current zoom and pan - these are NEVER modified by backend data
    const currentZoom = this.zoomLevel;
    const currentPanX = this.panX;
    const currentPanY = this.panY;
    
    // Load battlemap configuration (base dimensions only - zoom is never stored/loaded)
    if (battlemap.gridSize !== undefined) {
      this.gridSize = battlemap.gridSize;
    }
    
    // Check if base dimensions changed
    const baseWidthChanged = battlemap.canvasWidth && battlemap.canvasWidth !== this.baseCanvasWidth;
    const baseHeightChanged = battlemap.canvasHeight && battlemap.canvasHeight !== this.baseCanvasHeight;
    
    if (battlemap.canvasWidth) {
      this.baseCanvasWidth = battlemap.canvasWidth;
      // Update canvas element size to match base dimensions
      if (this.mapCanvas) {
        this.mapCanvas.nativeElement.style.width = this.baseCanvasWidth + 'px';
      }
    }
    if (battlemap.canvasHeight) {
      this.baseCanvasHeight = battlemap.canvasHeight;
      // Update canvas element size to match base dimensions
      if (this.mapCanvas) {
        this.mapCanvas.nativeElement.style.height = this.baseCanvasHeight + 'px';
      }
    }
    if (battlemap.mapImageUrl) {
      this.mapImageUrl = battlemap.mapImageUrl;
    }
    
    // CRITICAL: Zoom and pan are NEVER modified by backend data - they are purely local view state
    // The zoomLevel, panX, and panY variables are NEVER touched in this method
    // With CSS transforms, we don't need to update canvas size - the transform handles scaling
    
    // Safety check: Verify zoom and pan were not accidentally modified
    if (this.zoomLevel !== currentZoom || this.panX !== currentPanX || this.panY !== currentPanY) {
      console.error('ERROR: Zoom or pan was modified by applyBattlemapData - restoring original values!');
      this.zoomLevel = currentZoom;
      this.panX = currentPanX;
      this.panY = currentPanY;
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
          isGmOnly: token.isGmOnly || false,
          characterId: token.tokenId, // Assume tokenId is characterId for now
          avatarUrl: undefined // Will be loaded below
        }));
        // Find the highest token ID to set nextTokenId
        const maxId = Math.max(...this.tokens.map(t => t.id), 0);
        this.nextTokenId = maxId + 1;
        
        // Load character data to get avatar URLs
        this.loadTokenAvatars();
      } else {
        this.tokens = [];
      }
      this.lastSavedTokenHash = tokenHash;
    }
    
    // Re-center map after loading (only on initial load, and only if map hasn't been initialized yet)
    // This should only happen once on initial load, never during polling
    if (!skipIfSaving && !this.mapInitialized) {
      setTimeout(() => {
        // Ensure canvas size is set based on current zoom (should be 1.0 on initial load)
        this.centerMap();
        this.mapInitialized = true;
      }, 100);
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
      // IMPORTANT: Only save base dimensions and token positions in base canvas coordinates
      // Zoom, pan, and displayed canvas size are NEVER saved - they are purely local view state
      const battlemap: Battlemap = {
        gridSize: this.gridSize,
        canvasWidth: this.baseCanvasWidth,  // Base width (NOT zoomed)
        canvasHeight: this.baseCanvasHeight, // Base height (NOT zoomed)
        mapImageUrl: this.mapImageUrl,
        // zoomLevel, panX, panY are NEVER saved - they are local view state only
        tokens: this.tokens.map(token => ({
          tokenId: token.id,
          x: token.x,  // Base canvas coordinates (NOT affected by zoom)
          y: token.y,  // Base canvas coordinates (NOT affected by zoom)
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
          // Don't update canvas size here - it's already correct and zoom/pan are local state
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
    
    // Calculate position on base canvas (convert from viewport to base canvas coordinates)
    const canvasX = (mouseX - this.panX) / this.zoomLevel;
    const canvasY = (mouseY - this.panY) / this.zoomLevel;
    
    // Snap to grid cell center (in base canvas coordinates)
    const snappedX = this.snapToGrid(canvasX, false);
    const snappedY = this.snapToGrid(canvasY, true);
    
    // Convert back to viewport coordinates for display
    const viewportX = snappedX * this.zoomLevel + this.panX;
    const viewportY = snappedY * this.zoomLevel + this.panY;
    
    // Position cursor at snapped location
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
  
  // Get transform style for map canvas (translation and scaling via CSS transform)
  get mapTransform(): string {
    // Apply pan and zoom using CSS transforms
    // This is more performant and avoids coordinate calculation issues
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
  }
  
  // Center the map in the viewport
  centerMap(): void {
    if (!this.mapViewport || !this.mapCanvas) return;
    
    const viewport = this.mapViewport.nativeElement;
    
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    
    // With CSS transform, the canvas is scaled, so we need to account for zoom
    const scaledCanvasWidth = this.baseCanvasWidth * this.zoomLevel;
    const scaledCanvasHeight = this.baseCanvasHeight * this.zoomLevel;
    
    // Center the canvas
    this.panX = (viewportWidth - scaledCanvasWidth) / 2;
    this.panY = (viewportHeight - scaledCanvasHeight) / 2;
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
      
      // Mark map as initialized (user has panned)
      this.mapInitialized = true;
      
      // Pan state is local only - not saved to backend
    } else if (this.isDraggingToken && this.draggedTokenId !== null) {
      this.updateTokenDrag(event);
    }
  }
  
  // Get grid cell size in pixels (average for circular tokens) - in base canvas coordinates
  getGridCellSize(): number {
    // Use average of base width and height to get a size that fits in cells
    const cellSize = (this.baseCanvasWidth + this.baseCanvasHeight) / (2 * this.gridSize);
    return cellSize;
  }

  // Get token size (smaller than grid cell to fit better) - in base canvas coordinates
  getTokenSize(): number {
    return this.getGridCellSize() * 0.75; // 75% of grid cell size
  }
  
  // Get grid cell width in pixels (base canvas coordinates)
  getGridCellWidth(): number {
    return this.baseCanvasWidth / this.gridSize;
  }
  
  // Get grid cell height in pixels (base canvas coordinates)
  getGridCellHeight(): number {
    return this.baseCanvasHeight / this.gridSize;
  }
  
  // Snap a coordinate to the center of the nearest grid cell
  // coord is in base canvas coordinates (not zoomed)
  snapToGrid(coord: number, isY: boolean = false): number {
    const cellSize = isY ? this.getGridCellHeight() : this.getGridCellWidth();
    
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
  
  // Place a token at the clicked position (snapped to grid)
  placeToken(event: MouseEvent): void {
    if (!this.mapViewport || !this.mapCanvas) return;
    
    const viewport = this.mapViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();
    
    // Get mouse position relative to viewport
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate position on canvas (accounting for pan only, convert to base canvas coordinates)
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
    
    // Store old zoom for calculations
    const oldZoom = this.zoomLevel;
    
    // Calculate the point under the mouse in base canvas coordinates (using OLD zoom and pan)
    // With CSS transform, we need to account for the transform origin
    const canvasX = (mouseX - this.panX) / oldZoom;
    const canvasY = (mouseY - this.panY) / oldZoom;
    
    // Apply new zoom level
    this.zoomLevel = newZoom;
    
    // Adjust pan so the same canvas point stays under the mouse
    // With CSS transform scale, the point scales from the transform origin (0,0)
    // So we adjust pan to compensate: panX = mouseX - canvasX * newZoom
    this.panX = mouseX - canvasX * this.zoomLevel;
    this.panY = mouseY - canvasY * this.zoomLevel;
    
    // Mark map as initialized (user has interacted with zoom)
    this.mapInitialized = true;
    
    // Zoom and pan are local only - not saved to backend
    // Tokens maintain their base positions (token.x, token.y) and are scaled by CSS transform
    // This ensures tokens stay in the same grid cell when zooming
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
    
    // Token position in base canvas coordinates (tokens are stored at base coordinates)
    // With CSS transform, tokens are positioned at (token.x, token.y) and scaled by the transform
    const tokenCanvasX = token.x;
    const tokenCanvasY = token.y;
    
    // Token position in viewport coordinates (accounting for CSS transform: translate + scale)
    const tokenViewportX = this.panX + tokenCanvasX * this.zoomLevel;
    const tokenViewportY = this.panY + tokenCanvasY * this.zoomLevel;
    
    // Calculate offset from token center to mouse position (in viewport coordinates)
    const offsetX = mouseX - tokenViewportX;
    const offsetY = mouseY - tokenViewportY;
    
    // Convert offset to base canvas coordinates
    const canvasOffsetX = offsetX / this.zoomLevel;
    const canvasOffsetY = offsetY / this.zoomLevel;
    
    // Start dragging
    this.isDraggingToken = true;
    this.draggedTokenId = tokenId;
    this.dragStartX = mouseX;
    this.dragStartY = mouseY;
    // Store just the offset (not the absolute position) so token follows mouse smoothly
    this.dragStartTokenX = canvasOffsetX;
    this.dragStartTokenY = canvasOffsetY;
    
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
    
    // Convert mouse position to base canvas coordinates
    const canvasX = (mouseX - this.panX) / this.zoomLevel;
    const canvasY = (mouseY - this.panY) / this.zoomLevel;
    
    // Update token position (subtract the offset to maintain relative position)
    const token = this.tokens.find(t => t.id === this.draggedTokenId);
    if (token) {
      token.x = canvasX - this.dragStartTokenX;
      token.y = canvasY - this.dragStartTokenY;
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

  // Handle drag over event (allow drop)
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    
    // Update visual feedback
    if (this.mapViewport) {
      this.mapViewport.nativeElement.classList.add('drag-over');
    }
  }

  // Handle drag leave event
  onDragLeave(event: DragEvent): void {
    // Only remove drag-over class if we're actually leaving the viewport
    if (!this.mapViewport) return;
    
    const viewport = this.mapViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    // Check if mouse is outside viewport bounds
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      viewport.classList.remove('drag-over');
    }
  }

  // Handle drop event (create token from character)
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.mapViewport || !this.mapCanvas || !event.dataTransfer) return;
    
    // Remove drag-over class
    if (this.mapViewport) {
      this.mapViewport.nativeElement.classList.remove('drag-over');
    }
    
    // Get character data from drag event
    const data = event.dataTransfer.getData('application/json');
    if (!data) return;
    
    let characterData: { characterId: number; characterName: string; avatarUrl: string };
    try {
      characterData = JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse character data from drag event:', e);
      return;
    }
    
    const viewport = this.mapViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();
    
    // Get mouse position relative to viewport
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate position on canvas (accounting for pan only, convert to base canvas coordinates)
    const canvasX = (mouseX - this.panX) / this.zoomLevel;
    const canvasY = (mouseY - this.panY) / this.zoomLevel;
    
    // Snap to grid cell center
    const snappedX = this.snapToGrid(canvasX, false);
    const snappedY = this.snapToGrid(canvasY, true);
    
    // Check if a token with this character ID already exists
    const existingToken = this.tokens.find(t => t.id === characterData.characterId);
    
    if (existingToken) {
      // Update existing token position and avatar
      existingToken.x = snappedX;
      existingToken.y = snappedY;
      existingToken.avatarUrl = characterData.avatarUrl;
      existingToken.characterId = characterData.characterId;
    } else {
      // Create new token using character ID as token ID
      this.tokens.push({
        id: characterData.characterId,
        x: snappedX,
        y: snappedY,
        isGmOnly: false,
        characterId: characterData.characterId,
        avatarUrl: characterData.avatarUrl
      });
      
      // Update nextTokenId if needed
      if (characterData.characterId >= this.nextTokenId) {
        this.nextTokenId = characterData.characterId + 1;
      }
    }
    
    // Save to backend
    this.saveBattlemap();
  }

  // Load avatar URLs for tokens that have character IDs
  loadTokenAvatars(): void {
    if (!this.sessionId) return;
    
    // Get unique character IDs from tokens
    const characterIds = this.tokens
      .filter(t => t.characterId && !t.avatarUrl)
      .map(t => t.characterId!)
      .filter((id, index, self) => self.indexOf(id) === index); // Unique
    
    if (characterIds.length === 0) return;
    
    // Load all characters for the session
    this.characterService.getAllCharacters(undefined, this.sessionId).subscribe({
      next: (characters: Character[]) => {
        // Create a map of character ID to avatar URL
        const avatarMap = new Map<number, string>();
        characters.forEach(char => {
          if (char.id) {
            avatarMap.set(char.id, this.getAvatarUrl(char));
          }
        });
        
        // Update tokens with avatar URLs
        this.tokens.forEach(token => {
          if (token.characterId && !token.avatarUrl) {
            const avatarUrl = avatarMap.get(token.characterId);
            if (avatarUrl) {
              token.avatarUrl = avatarUrl;
            }
          }
        });
      },
      error: (err) => {
        console.error('Error loading character avatars for tokens:', err);
      }
    });
  }

  // Get avatar URL for a character
  getAvatarUrl(character: Character): string {
    if (character.avatarUrl && character.avatarUrl.trim() !== '') {
      // If it's a relative URL, prepend the API base URL
      if (character.avatarUrl.startsWith('/')) {
        return `${environment.apiUrl.replace('/api', '')}${character.avatarUrl}`;
      }
      return character.avatarUrl;
    }
    return `${environment.apiUrl.replace('/api', '')}/api/char`;
  }
}
