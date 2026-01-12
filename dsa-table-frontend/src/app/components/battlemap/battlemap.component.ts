import { Component, Input, HostListener, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GameSessionService } from '../../services/game-session.service';
import { CharacterService } from '../../services/character.service';
import { ViewportService } from '../../services/viewport.service';
import { GridService } from '../../services/grid.service';
import { FogOfWarService } from '../../services/fog-of-war.service';
import { Battlemap, BattlemapToken } from '../../models/battlemap.model';
import { Character } from '../../models/character.model';
import { environment } from '../../../environments/environment';
import { Subscription, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TokenAppearanceDialogComponent, TokenAppearanceConfig } from '../token-appearance-dialog/token-appearance-dialog.component';
import { BackgroundImageDialogComponent, BackgroundImageResult } from '../background-image-dialog/background-image-dialog.component';

@Component({
  selector: 'app-battlemap',
  standalone: true,
  imports: [CommonModule, FormsModule, TokenAppearanceDialogComponent, BackgroundImageDialogComponent],
  templateUrl: './battlemap.component.html',
  styleUrl: './battlemap.component.scss'
})
export class BattlemapComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() sessionId?: number;
  @Input() mapImageUrl?: string;
  @Input() isGameMaster: boolean = false;
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showFogMenu) {
      this.showFogMenu = false;
    }
  }
  
  private battlemapSubscription?: Subscription;
  private pollingSubscription?: Subscription;
  private saveTimeout?: any;
  private isSaving: boolean = false;
  private lastSavedTokenHash: string = '';
  
  private readonly SAVE_DEBOUNCE_MS = 300;
  private readonly POLLING_INTERVAL_MS = 2000;
  
  @ViewChild('mapViewport', { static: false }) mapViewport!: ElementRef<HTMLDivElement>;
  @ViewChild('mapCanvas', { static: false }) mapCanvas!: ElementRef<HTMLDivElement>;
  
  baseCanvasWidth: number = 512;
  baseCanvasHeight: number = 512;
  
  private mapInitialized: boolean = false;
  
  isPanning: boolean = false;
  private panStart: { panStartX: number; panStartY: number; panStartOffsetX: number; panStartOffsetY: number } | null = null;
  
  isAddingToken: boolean = false;
  
  isFogOfWarMode: boolean = false;
  showFogMenu: boolean = false;
  
  showTokenNames: boolean = false;
  
  tokens: Array<{ id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; playerName?: string; color?: string; borderColor?: string; name?: string }> = [];
  private nextTokenId: number = 1;
  
  pendingTokenConfig: { color?: string; avatarUrl?: string; borderColor?: string; name?: string } | null = null;
  
  showTokenAppearanceDialog: boolean = false;
  editingToken: { id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; playerName?: string; color?: string; borderColor?: string; name?: string } | null = null;
  private playerCharacterName: string | null = null;
  isPlayerEditingOwnToken: boolean = false;
  
  isDraggingToken: boolean = false;
  draggedTokenId: number | null = null;
  dragStartX: number = 0;
  dragStartY: number = 0;
  dragStartTokenX: number = 0;
  dragStartTokenY: number = 0;
  
  showBackgroundImageDialog: boolean = false;
  
  mapSvgContent: SafeHtml | null = null;
  private lastMapImageUrl: string | null = null;
  
  constructor(
    private gameSessionService: GameSessionService,
    private characterService: CharacterService,
    private viewportService: ViewportService,
    private gridService: GridService,
    private fogOfWarService: FogOfWarService,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mapImageUrl'] && !changes['mapImageUrl'].firstChange) {
      this.loadMapSvg();
    }
  }
  
  ngAfterViewInit(): void {
    setTimeout(() => {
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
      this.loadPlayerCharacter();
      this.startPolling();
      
      // Load SVG if mapImageUrl is already set
      if (this.mapImageUrl) {
        this.loadMapSvg();
      }
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
  
  loadPlayerCharacter(): void {
    if (!this.sessionId || this.isGameMaster) {
      return;
    }
    
    this.gameSessionService.getMyCharacter(this.sessionId).subscribe({
      next: (character) => {
        if (character && !this.isGameMaster) {
          this.playerCharacterName = character.name || null;
        }
      },
      error: (error) => {
        if (this.isGameMaster || error.status === 404) {
          return;
        }
        console.error('Error loading player character:', error);
      }
    });
  }
  
  /**
   * Apply battlemap data (with option to skip if currently saving)
   * IMPORTANT: Zoom and pan are NEVER loaded from backend - they are purely local view state
   */
  applyBattlemapData(battlemap: Battlemap, skipIfSaving: boolean = true): void {
    if (skipIfSaving && this.isSaving) return;
    
    const currentViewportState = this.viewportService.getState();
    this.updateBattlemapConfiguration(battlemap);
    this.verifyViewportStateIntegrity(currentViewportState);
    this.updateTokensFromBattlemap(battlemap);
    this.updateFogOfWar(battlemap);
    this.handleInitialMapCentering(skipIfSaving);
  }
  
  private updateBattlemapConfiguration(battlemap: Battlemap): void {
    if (battlemap.gridSize !== undefined) {
      this.gridService.setGridSize(battlemap.gridSize);
    }
    
    if (battlemap.canvasWidth) {
      this.baseCanvasWidth = battlemap.canvasWidth;
      if (this.mapCanvas) {
        this.mapCanvas.nativeElement.style.width = this.baseCanvasWidth + 'px';
      }
    }
    
    if (battlemap.canvasHeight) {
      this.baseCanvasHeight = battlemap.canvasHeight;
      if (this.mapCanvas) {
        this.mapCanvas.nativeElement.style.height = this.baseCanvasHeight + 'px';
      }
    }
    
    if (battlemap.mapImageUrl) {
      // Only reload SVG if the URL has actually changed
      if (this.mapImageUrl !== battlemap.mapImageUrl) {
        this.mapImageUrl = battlemap.mapImageUrl;
        this.loadMapSvg();
      }
    } else if (this.mapImageUrl) {
      // Clear map if URL is removed
      this.mapImageUrl = undefined;
      this.mapSvgContent = null;
      this.lastMapImageUrl = null;
    }
  }
  
  /**
   * Verify that viewport state (zoom/pan) was not accidentally modified
   */
  private verifyViewportStateIntegrity(originalState: { zoomLevel: number; panX: number; panY: number }): void {
    const newState = this.viewportService.getState();
    if (newState.zoomLevel !== originalState.zoomLevel || 
        newState.panX !== originalState.panX || 
        newState.panY !== originalState.panY) {
      console.error('ERROR: Zoom or pan was modified by applyBattlemapData - restoring original values!');
      this.viewportService.setState(originalState);
    }
  }
  
  private updateTokensFromBattlemap(battlemap: Battlemap): void {
    if (this.isSaving) return;
    
    const tokenHash = this.getTokenHash(battlemap.tokens || []);
    if (tokenHash === this.lastSavedTokenHash) return;
    
    if (battlemap.tokens && battlemap.tokens.length > 0) {
      // Map tokens from backend, preserving any local state we need
      const newTokens = battlemap.tokens.map(token => this.mapDtoToToken(token));
      
      // Merge with existing tokens to preserve avatarUrl if backend doesn't have it yet
      // This prevents tokens from turning black during polling
      const existingTokensMap = new Map(this.tokens.map(t => [t.id, t]));
      const mergedTokens = newTokens.map(newToken => {
        const existing = existingTokensMap.get(newToken.id);
        if (existing) {
          // Preserve avatarUrl from existing token if backend doesn't have it
          if (existing.avatarUrl && !newToken.avatarUrl) {
            newToken.avatarUrl = existing.avatarUrl;
          }
          // Preserve playerName from existing token if backend doesn't have it
          if (existing.playerName && !newToken.playerName) {
            newToken.playerName = existing.playerName;
          }
        }
        return newToken;
      });
      
      // Use tokens from backend only - fully synchronized
      this.tokens = mergedTokens;
      this.nextTokenId = Math.max(...this.tokens.map(t => t.id), 0) + 1;
      this.loadTokenAvatars();
    } else {
      // Backend has no tokens - clear local tokens too
      this.tokens = [];
      this.nextTokenId = 1;
    }
    
    this.lastSavedTokenHash = tokenHash;
  }
  
  private mapDtoToToken(dto: BattlemapToken): { id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; playerName?: string; color?: string; borderColor?: string; name?: string } {
    // Map from backend JSON property names (tid, gm, url, bc) to internal names
    // Backend uses shortened property names via @JsonProperty annotations
    const tokenId = dto.tokenId ?? dto.tid ?? dto.id;
    const isGmOnly = dto.isGmOnly ?? dto.gm ?? false;
    let avatarUrl = dto.avatarUrl ?? dto.url;
    const borderColor = dto.borderColor ?? dto.bc;
    
    // If no avatarUrl but has environment object properties (et, ec, es), generate the URL
    if (!avatarUrl && dto.et) {
      avatarUrl = this.getEnvironmentObjectUrl(dto.et, dto.ec, dto.es);
    }
    
    if (!tokenId && tokenId !== 0) {
      console.warn('Token missing tokenId/tid:', dto);
    }
    
    // Extract playerName from dto (now in backend model)
    const playerName = dto.playerName;
    
    return {
      id: tokenId ?? 0, // Fallback to 0 if undefined, but log warning
      x: dto.x ?? 0,
      y: dto.y ?? 0,
      isGmOnly: isGmOnly,
      playerName: playerName, // Will be "npc" for NPC tokens, or character name for player tokens
      avatarUrl: avatarUrl,
      color: dto.color,
      borderColor: borderColor,
      name: dto.name
    };
  }

  /**
   * Generate environment object URL from properties
   */
  private getEnvironmentObjectUrl(envType: string, envColor?: string, envSize?: number): string {
    const params = new URLSearchParams();
    params.set('type', envType);
    if (envColor) {
      params.set('color', envColor);
    }
    if (envSize) {
      params.set('size', envSize.toString());
    }
    return `${environment.apiUrl}/env-object?${params.toString()}`;
  }
  
  private updateFogOfWar(battlemap: Battlemap): void {
    this.fogOfWarService.setFogAreas(battlemap.fogRevealedAreas || []);
  }
  
  private handleInitialMapCentering(skipIfSaving: boolean): void {
    if (!skipIfSaving && !this.mapInitialized) {
      setTimeout(() => {
        this.centerMap();
        this.mapInitialized = true;
      }, 100);
    }
  }
  
  getTokenHash(tokens: BattlemapToken[]): string {
    return tokens
      .map(t => `${t.tokenId}:${t.x.toFixed(2)}:${t.y.toFixed(2)}:${t.isGmOnly}:${t.color || ''}:${t.avatarUrl || ''}:${t.borderColor || ''}:${t.name || ''}`)
      .sort()
      .join('|');
  }
  
  startPolling(): void {
    if (!this.sessionId) return;
    
    this.pollingSubscription = this.gameSessionService.pollBattlemap(this.sessionId, this.POLLING_INTERVAL_MS).subscribe({
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
  
  /**
   * Save battlemap data to backend (debounced)
   * IMPORTANT: Only base dimensions and token positions are saved - zoom/pan are local view state
   */
  saveBattlemap(): void {
    if (!this.sessionId) return;
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.isSaving = true;
    
    this.saveTimeout = setTimeout(() => {
      const battlemap = this.buildBattlemapDto();
      const tokenHash = this.getTokenHash(battlemap.tokens || []);
      
      this.gameSessionService.updateBattlemap(this.sessionId!, battlemap).subscribe({
        next: (savedBattlemap: Battlemap) => {
          // After save completes, reload from backend to ensure full synchronization
          // This ensures tokens are always in sync with backend
          if (savedBattlemap) {
            this.updateTokensFromBattlemap(savedBattlemap);
          } else {
            // If no response, just update the hash to prevent unnecessary reloads
            this.lastSavedTokenHash = tokenHash;
          }
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error saving battlemap:', error);
          this.isSaving = false;
        }
      });
    }, this.SAVE_DEBOUNCE_MS);
  }
  
  private buildBattlemapDto(): Battlemap {
    const dto: Battlemap = {
      gridSize: this.gridService.gridSize,
      canvasWidth: this.baseCanvasWidth,
      canvasHeight: this.baseCanvasHeight,
      tokens: this.tokens.map(token => this.mapTokenToDto(token)),
      fogRevealedAreas: this.fogOfWarService.getFogAreas()
    };
    
    if (this.mapImageUrl !== undefined) {
      dto.mapImageUrl = this.mapImageUrl;
    }
    
    return dto;
  }
  
  setupEventListeners(): void {
    if (!this.mapViewport) return;
    
    const viewport = this.mapViewport.nativeElement;
    
    viewport.addEventListener('mousedown', (e: MouseEvent) => this.onMouseDown(e));
    
    viewport.addEventListener('mousemove', (e: MouseEvent) => {
      this.onMouseMove(e);
      this.updateTokenCursor(e);
    });
    
    viewport.addEventListener('mouseup', (e: MouseEvent) => this.onMouseUp(e));
    
    viewport.addEventListener('mouseenter', (e: MouseEvent) => {
      this.onMouseEnter(e);
    });
    
    viewport.addEventListener('mouseleave', (e: MouseEvent) => {
      this.onMouseLeave(e);
      this.hideTokenCursor();
    });
    
    viewport.addEventListener('wheel', (e: WheelEvent) => this.onWheel(e), { passive: false });
    
    viewport.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isDraggingToken) {
        this.updateTokenDrag(e);
      } else if (this.fogOfWarService.isPainting && this.isFogOfWarMode) {
        this.paintFogCell(e);
      }
    });
    
    document.addEventListener('mouseup', (e: MouseEvent) => {
      if (this.isDraggingToken && e.button === 0) {
        this.finishTokenDrag(e);
      } else if (this.fogOfWarService.isPainting && e.button === 0) {
        this.stopFogPainting();
      }
    });
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  /**
   * Get viewport bounding rectangle
   */
  private getViewportRect(): DOMRect | null {
    if (!this.mapViewport) return null;
    return this.mapViewport.nativeElement.getBoundingClientRect();
  }
  
  private getMousePosition(event: MouseEvent): { x: number; y: number } | null {
    const rect = this.getViewportRect();
    if (!rect) return null;
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  
  /**
   * Update viewport cursor style
   */
  private setViewportCursor(cursor: string): void {
    if (this.mapViewport) {
      this.mapViewport.nativeElement.style.cursor = cursor;
    }
  }
  
  private mapTokenToDto(token: { id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; playerName?: string; color?: string; borderColor?: string; name?: string }): BattlemapToken {
    // Map to backend JSON format using shortened property names
    // Backend uses @JsonProperty annotations: tid, gm, url, bc
    const dto: any = {
      tid: token.id, // Backend expects "tid" in JSON
      x: token.x,
      y: token.y,
      gm: token.isGmOnly // Backend expects "gm" in JSON
    };
    
    if (token.color !== undefined) {
      dto.color = token.color;
    }
    if (token.avatarUrl !== undefined) {
      dto.url = token.avatarUrl; // Backend expects "url" in JSON
    }
    if (token.borderColor !== undefined) {
      dto.bc = token.borderColor; // Backend expects "bc" in JSON
    }
    if (token.name !== undefined) {
      dto.name = token.name;
    }
    if (token.playerName !== undefined) {
      dto.playerName = token.playerName; // Add playerName to DTO
    }
    
    return dto as BattlemapToken;
  }
  
  private exitTokenPlacementMode(): void {
    this.isAddingToken = false;
    this.setViewportCursor('grab');
    if (this.mapViewport) {
      this.mapViewport.nativeElement.classList.remove('token-placement-mode');
    }
    this.hideTokenCursor();
  }
  
  /**
   * Enter token placement mode
   */
  private enterTokenPlacementMode(): void {
    this.isAddingToken = true;
    this.setViewportCursor('none');
    if (this.mapViewport) {
      this.mapViewport.nativeElement.classList.add('token-placement-mode');
    }
  }
  
  updateTokenCursor(event: MouseEvent): void {
    if (!this.isAddingToken || !this.mapViewport || !this.mapCanvas) {
      this.hideTokenCursor();
      return;
    }
    
    const viewport = this.mapViewport.nativeElement;
    const cursor = viewport.querySelector('.token-cursor') as HTMLElement;
    if (!cursor) return;
    
    const mousePos = this.getMousePosition(event);
    if (!mousePos) return;
    
    const canvasCoords = this.gridService.viewportToCanvas(mousePos.x, mousePos.y, this.panX, this.panY, this.zoomLevel);
    const snappedX = this.snapToGrid(canvasCoords.x, false);
    const snappedY = this.snapToGrid(canvasCoords.y, true);
    const viewportCoords = this.gridService.canvasToViewport(snappedX, snappedY, this.panX, this.panY, this.zoomLevel);
    
    cursor.style.display = 'block';
    cursor.style.left = viewportCoords.x + 'px';
    cursor.style.top = viewportCoords.y + 'px';
  }
  
  hideTokenCursor(): void {
    if (!this.mapViewport) return;
    
    const viewport = this.mapViewport.nativeElement;
    const cursor = viewport.querySelector('.token-cursor') as HTMLElement;
    
    if (cursor && !this.isAddingToken) {
      cursor.style.display = 'none';
    }
  }
  
  // ============================================================================
  // Template Getters
  // ============================================================================
  
  /**
   * Placeholder - using a data URI for a simple green rectangle
   */
  get placeholderImageUrl(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzRmN2MyYSIvPjwvc3ZnPg==';
  }
  
  get gridCellSizePercent(): number {
    return this.gridService.getGridCellSizePercent();
  }
  
  get mapTransform(): string {
    return this.viewportService.getTransform();
  }
  
  get zoomLevel(): number {
    return this.viewportService.zoomLevel;
  }
  
  get panX(): number {
    return this.viewportService.panX;
  }
  
  get panY(): number {
    return this.viewportService.panY;
  }
  
  centerMap(): void {
    if (!this.mapViewport || !this.mapCanvas) return;
    
    const viewport = this.mapViewport.nativeElement;
    this.viewportService.centerMap(viewport.clientWidth, viewport.clientHeight, this.baseCanvasWidth, this.baseCanvasHeight);
  }
  
  onMouseDown(event: MouseEvent): void {
    if (event.button === 2) {
      event.preventDefault();
      this.isPanning = true;
      this.panStart = this.viewportService.startPan(event.clientX, event.clientY);
      this.setViewportCursor('grabbing');
    } else if (event.button === 0 && this.isAddingToken) {
      event.preventDefault();
      this.placeToken(event);
    } else if (event.button === 0 && this.isFogOfWarMode) {
      event.preventDefault();
      this.startFogPainting(event);
    }
  }
  
  onMouseMove(event: MouseEvent): void {
    if (this.isPanning && this.panStart) {
      if (!this.mapViewport) return;
      const viewport = this.mapViewport.nativeElement;
      this.viewportService.updatePan(
        this.panStart, 
        event.clientX, 
        event.clientY, 
        viewport.clientWidth, 
        viewport.clientHeight, 
        this.baseCanvasWidth, 
        this.baseCanvasHeight
      );
      this.mapInitialized = true;
    } else if (this.isDraggingToken && this.draggedTokenId !== null) {
      this.updateTokenDrag(event);
    } else if (this.fogOfWarService.isPainting && this.isFogOfWarMode) {
      this.paintFogCell(event);
    }
  }
  
  onMouseUp(event: MouseEvent): void {
    if (event.button === 2) {
      this.isPanning = false;
      this.setViewportCursor('grab');
    } else if (event.button === 0 && this.isDraggingToken) {
      this.finishTokenDrag(event);
    } else if (event.button === 0 && this.fogOfWarService.isPainting) {
      this.stopFogPainting();
    }
  }
  
  onMouseEnter(event: MouseEvent): void {
    // Update cursor when re-entering viewport based on current mode
    if (this.isFogOfWarMode) {
      this.updateFogOfWarCursor();
    } else if (this.isAddingToken) {
      this.setViewportCursor('crosshair');
    } else if (!this.isDraggingToken) {
      this.setViewportCursor('grab');
    }
  }
  
  onMouseLeave(event: MouseEvent): void {
    this.isPanning = false;
    
    if (this.isDraggingToken) {
      this.finishTokenDrag(event);
    }
    
    if (this.fogOfWarService.isPainting) {
      this.stopFogPainting();
    }
    
    // Reset cursor when leaving viewport
    this.setViewportCursor('grab');
  }
  
  /**
   * Handle wheel zoom
   */
  onWheel(event: WheelEvent): void {
    if (!this.mapViewport || !this.mapCanvas) return;
    
    const viewport = this.mapViewport.nativeElement;
    this.viewportService.handleWheel(event, viewport.clientWidth, viewport.clientHeight, this.baseCanvasWidth, this.baseCanvasHeight);
    this.mapInitialized = true; // Mark map as initialized (user has interacted with zoom)
  }
  
  // ============================================================================
  // Fog of War Management
  // ============================================================================
  
  startFogPainting(event: MouseEvent): void {
    if (!this.isFogOfWarMode || !this.mapViewport || !this.mapCanvas) return;
    
    this.fogOfWarService.startPainting();
    this.paintFogCell(event);
  }
  
  paintFogCell(event: MouseEvent): void {
    if (!this.fogOfWarService.isPainting || !this.mapViewport || !this.mapCanvas) return;
    
    const mousePos = this.getMousePosition(event);
    if (!mousePos) return;
    
    const canvasCoords = this.gridService.viewportToCanvas(mousePos.x, mousePos.y, this.panX, this.panY, this.zoomLevel);
    
    const gridCellWidth = this.gridService.getGridCellWidth(this.baseCanvasWidth);
    const gridCellHeight = this.gridService.getGridCellHeight(this.baseCanvasHeight);
    
    const gridX = Math.floor(canvasCoords.x / gridCellWidth);
    const gridY = Math.floor(canvasCoords.y / gridCellHeight);
    
    const maxGridX = Math.floor(this.baseCanvasWidth / gridCellWidth);
    const maxGridY = Math.floor(this.baseCanvasHeight / gridCellHeight);
    
    if (gridX >= 0 && gridX < maxGridX && gridY >= 0 && gridY < maxGridY) {
      this.fogOfWarService.paintCell(gridX, gridY);
      this.saveBattlemap();
    }
  }
  
  stopFogPainting(): void {
    if (this.fogOfWarService.isPainting) {
      this.fogOfWarService.stopPainting();
    }
  }
  
  get fogMode(): 'add' | 'remove' {
    return this.fogOfWarService.fogMode;
  }
  
  get fogRevealedAreas(): Array<{ gridX: number; gridY: number }> {
    return this.fogOfWarService.getFogAreas();
  }
  
  getRevealedCellPositions(): Array<{ x: number; y: number; width: number; height: number }> {
    const areas = this.fogRevealedAreas;
    const gridCellWidth = this.gridService.getGridCellWidth(this.baseCanvasWidth);
    const gridCellHeight = this.gridService.getGridCellHeight(this.baseCanvasHeight);
    
    return areas.map(area => ({
      x: area.gridX * gridCellWidth,
      y: area.gridY * gridCellHeight,
      width: gridCellWidth,
      height: gridCellHeight
    }));
  }
  
  getTokenSize(): number {
    return this.gridService.getTokenSize(this.baseCanvasWidth, this.baseCanvasHeight);
  }
  
  getImageScaleFactor(): number {
    return this.gridService.getImageScaleFactor();
  }
  
  getTokenImageSize(): number {
    return this.gridService.getTokenImageSize(this.baseCanvasWidth, this.baseCanvasHeight);
  }
  
  snapToGrid(coord: number, isY: boolean = false): number {
    return this.gridService.snapToGrid(coord, isY, this.baseCanvasWidth, this.baseCanvasHeight);
  }
  
  // ============================================================================
  // Token Management
  // ============================================================================
  
  /**
   * Place a token at the clicked position (snapped to grid)
   */
  placeToken(event: MouseEvent): void {
    if (!this.mapViewport || !this.mapCanvas) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.pendingTokenConfig) {
      this.exitTokenPlacementMode();
      return;
    }
    
    const mousePos = this.getMousePosition(event);
    if (!mousePos) return;
    
    const canvasCoords = this.gridService.viewportToCanvas(mousePos.x, mousePos.y, this.panX, this.panY, this.zoomLevel);
    const snappedX = this.snapToGrid(canvasCoords.x, false);
    const snappedY = this.snapToGrid(canvasCoords.y, true);
    
    const token = {
      id: this.nextTokenId++,
      x: snappedX,
      y: snappedY,
      isGmOnly: false,
      playerName: 'npc', // NPC tokens use "npc"
      color: this.pendingTokenConfig.color,
      avatarUrl: this.pendingTokenConfig.avatarUrl,
      borderColor: this.pendingTokenConfig.borderColor,
      name: this.pendingTokenConfig.name
    };
    
    this.tokens.push(token);
    this.pendingTokenConfig = null;
    
    this.saveBattlemap();
    this.exitTokenPlacementMode();
  }
  
  
  // Menu actions
  onAddToken(): void {
    // If already in token placement mode, cancel it
    if (this.isAddingToken) {
      this.exitTokenPlacementMode();
      this.pendingTokenConfig = null;
      // Close dialog if open
      if (this.showTokenAppearanceDialog) {
        this.closeTokenAppearanceDialog();
      }
      return;
    }
    
    // Close any open dialogs first
    if (this.showTokenAppearanceDialog) {
      this.closeTokenAppearanceDialog();
    }
    if (this.showBackgroundImageDialog) {
      this.showBackgroundImageDialog = false;
    }
    
    // Clear any existing state
    this.editingToken = null;
    this.pendingTokenConfig = null;
    
    // New tokens via menu are always non-player tokens, so use full edit mode
    this.isPlayerEditingOwnToken = false;
    
    // Open the token appearance dialog first to configure the token
    const tempTokenId = this.nextTokenId++;
    const tempToken = {
      id: tempTokenId,
      x: 0, // Will be set when placed
      y: 0, // Will be set when placed
      isGmOnly: false
    };
    
    // Open the appearance dialog
    this.openTokenAppearanceDialog(tempToken);
  }
  
  onConfigureSize(): void {
    const currentSize = this.gridService.gridSize;
    const newSize = prompt(`Enter grid size (current: ${currentSize}x${currentSize}):`, currentSize.toString());
    if (newSize !== null) {
      const size = parseInt(newSize, 10);
      if (!isNaN(size) && size > 0 && size <= 50) {
        this.gridService.setGridSize(size);
        this.saveBattlemap();
      }
    }
  }
  
  onSetBackgroundImage(): void {
    this.showBackgroundImageDialog = true;
  }

  onBackgroundImageConfirmed(result: BackgroundImageResult): void {
    this.mapImageUrl = result.imageUrl;
    this.showBackgroundImageDialog = false;
    // Environment objects are already included in the background SVG image
    // No need to load them separately as tokens
    this.loadMapSvg();
    this.saveBattlemap();
  }
  
  private loadMapSvg(): void {
    if (!this.mapImageUrl) {
      this.mapSvgContent = null;
      this.lastMapImageUrl = null;
      return;
    }
    
    // Skip loading if URL hasn't changed
    if (this.mapImageUrl === this.lastMapImageUrl) {
      return;
    }
    
    // If it's not a battlemap-image URL (e.g., external image), use img tag
    if (!this.mapImageUrl.includes('/battlemap-image')) {
      this.mapSvgContent = null;
      this.lastMapImageUrl = this.mapImageUrl;
      return;
    }
    
    // Update last URL before fetching to prevent duplicate requests
    this.lastMapImageUrl = this.mapImageUrl;
    
    // Fetch the SVG content
    this.http.get(this.mapImageUrl, { responseType: 'text' }).subscribe({
      next: (svgContent) => {
        // Strip DOCTYPE if present (not needed when embedding via innerHTML)
        let cleanedSvg = svgContent.replace(/<!DOCTYPE[^>]*>/i, '').trim();
        
        // Bypass security since we control the backend and need SVG <image> tags to work
        // The SVG is generated by our own backend code, so it's safe
        this.mapSvgContent = this.sanitizer.bypassSecurityTrustHtml(cleanedSvg);
      },
      error: (err) => {
        console.error('Error loading map SVG:', err);
        this.mapSvgContent = null;
        // Reset lastMapImageUrl on error so it can be retried
        if (this.mapImageUrl === this.lastMapImageUrl) {
          this.lastMapImageUrl = null;
        }
      }
    });
  }

  onBackgroundImageCanceled(): void {
    this.showBackgroundImageDialog = false;
  }
  
  onToggleFogOfWar(): void {
    this.isFogOfWarMode = !this.isFogOfWarMode;
    this.showFogMenu = false;
    this.updateFogOfWarCursor();
  }
  
  /**
   * Hide all fog immediately (set all cells to fogged)
   */
  hideAllFog(): void {
    if (!this.mapViewport || !this.mapCanvas) return;
    
    // Clear all revealed cells (all fog everywhere)
    this.fogOfWarService.setFogAreas([]);
    this.showFogMenu = false;
    this.saveBattlemap();
  }
  
  /**
   * Reveal all fog immediately (clear all fog)
   */
  revealAllFog(): void {
    if (!this.mapViewport || !this.mapCanvas) return;
    
    const gridCellWidth = this.gridService.getGridCellWidth(this.baseCanvasWidth);
    const gridCellHeight = this.gridService.getGridCellHeight(this.baseCanvasHeight);
    
    const maxGridX = Math.floor(this.baseCanvasWidth / gridCellWidth);
    const maxGridY = Math.floor(this.baseCanvasHeight / gridCellHeight);
    
    // Reveal all cells (no fog anywhere)
    const allCells: Array<{ gridX: number; gridY: number }> = [];
    for (let x = 0; x < maxGridX; x++) {
      for (let y = 0; y < maxGridY; y++) {
        allCells.push({ gridX: x, gridY: y });
      }
    }
    this.fogOfWarService.setFogAreas(allCells);
    this.showFogMenu = false;
    this.saveBattlemap();
  }
  
  /**
   * Update cursor based on fog of war mode
   */
  private updateFogOfWarCursor(): void {
    if (!this.mapViewport) return;
    
    if (this.isFogOfWarMode) {
      // Use crosshair for add, not-allowed for remove
      this.setViewportCursor(this.fogMode === 'add' ? 'crosshair' : 'not-allowed');
      this.mapViewport.nativeElement.classList.add('fog-of-war-mode');
    } else {
      this.setViewportCursor('grab');
      this.mapViewport.nativeElement.classList.remove('fog-of-war-mode');
    }
  }
  
  onFogButtonRightClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.showFogMenu = !this.showFogMenu;
  }
  
  onToggleTokenNames(): void {
    this.showTokenNames = !this.showTokenNames;
  }
  
  setFogMode(mode: 'add' | 'remove'): void {
    this.fogOfWarService.setFogMode(mode);
    this.showFogMenu = false;
    
    if (this.isFogOfWarMode) {
      this.updateFogOfWarCursor();
    }
  }
  
  getFogButtonTitle(): string {
    if (!this.isFogOfWarMode) {
      return 'Fog of War (Right-click to choose mode)';
    }
    return this.fogMode === 'add' 
      ? 'Add Fog Mode - Click and drag to add fog (Right-click to change)' 
      : 'Remove Fog Mode - Click and drag to reveal areas (Right-click to change)';
  }
  
  
  onTokenContextMenu(event: MouseEvent, tokenId: number): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Don't open dialog if in token placement mode
    if (this.isAddingToken) return;
    
    const token = this.tokens.find(t => t.id === tokenId);
    if (!token) return;
    
    // Close any other open dialogs first
    if (this.showBackgroundImageDialog) {
      this.showBackgroundImageDialog = false;
    }
    
    // Determine dialog mode:
    // Player mode (simple) = tokens with playerName !== "npc" (player tokens)
    // Full edit mode = tokens with playerName === "npc" (non-player tokens)
    if (this.isGameMaster) {
      // GM: 
      // - Player tokens (playerName !== "npc") = simple dialog
      // - Non-player tokens (playerName === "npc") = full edit dialog with avatar editing
      this.isPlayerEditingOwnToken = token.playerName !== undefined && token.playerName !== 'npc';
      this.openTokenAppearanceDialog(token);
    } else {
      // Player: Can only edit their own token, and only in player mode
      if (!token.playerName || token.playerName === 'npc' || token.playerName !== this.playerCharacterName) return;
      this.isPlayerEditingOwnToken = true;
      this.openTokenAppearanceDialog(token);
    }
  }
  
  openTokenAppearanceDialog(token: { id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; playerName?: string; color?: string; borderColor?: string; name?: string }): void {
    this.editingToken = { ...token };
    this.showTokenAppearanceDialog = true;
  }
  
  onTokenAppearanceSaved(config: TokenAppearanceConfig): void {
    if (!this.editingToken) return;
    
    const isNewToken = !this.tokens.find(t => t.id === this.editingToken!.id);
    
    if (isNewToken) {
      this.handleNewTokenConfiguration(config);
    } else {
      this.handleExistingTokenUpdate(config);
    }
  }
  
  private handleNewTokenConfiguration(config: TokenAppearanceConfig): void {
    this.pendingTokenConfig = config;
    this.enterTokenPlacementMode();
    this.closeTokenAppearanceDialog();
  }
  
  private handleExistingTokenUpdate(config: TokenAppearanceConfig): void {
    const token = this.tokens.find(t => t.id === this.editingToken!.id);
    if (!token) return;
    
    if (this.isPlayerEditingOwnToken) {
      if (config.borderColor !== undefined) {
        token.borderColor = config.borderColor;
      }
    } else {
      token.borderColor = config.borderColor;
      token.avatarUrl = config.avatarUrl;
      token.color = config.color;
      if (config.name !== undefined && token.playerName === 'npc') {
        token.name = config.name;
      }
    }
    
    this.saveBattlemap();
    this.closeTokenAppearanceDialog();
  }

  onTokenDeleted(): void {
    if (!this.editingToken) return;
    
    const tokenIndex = this.tokens.findIndex(t => t.id === this.editingToken!.id);
    if (tokenIndex > -1) {
      this.tokens.splice(tokenIndex, 1);
      this.saveBattlemap();
    }
    
    this.closeTokenAppearanceDialog();
  }
  
  // Close token appearance dialog
  closeTokenAppearanceDialog(): void {
    const wasConfiguringNewToken = this.editingToken && !this.tokens.find(t => t.id === this.editingToken!.id);
    
    this.showTokenAppearanceDialog = false;
    this.editingToken = null;
    
    if (wasConfiguringNewToken && this.pendingTokenConfig !== null && !this.isAddingToken) {
      this.pendingTokenConfig = null;
    }
  }
  
  
  /**
   * Start dragging a token
   */
  onTokenMouseDown(event: MouseEvent, tokenId: number): void {
    if (event.button !== 0 || this.isAddingToken) return; // Only left click, and not in placement mode
    
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.mapViewport || !this.mapCanvas) return;
    
    const token = this.tokens.find(t => t.id === tokenId);
    if (!token) return;
    
    const mousePos = this.getMousePosition(event);
    if (!mousePos) return;
    console.log('tokens: ', this.tokens);
    
    // Token position in viewport coordinates (accounting for CSS transform: translate + scale)
    const tokenViewportCoords = this.gridService.canvasToViewport(token.x, token.y, this.panX, this.panY, this.zoomLevel);
    
    // Calculate offset from token center to mouse position (in viewport coordinates)
    const offsetX = mousePos.x - tokenViewportCoords.x;
    const offsetY = mousePos.y - tokenViewportCoords.y;
    
    // Convert offset to base canvas coordinates
    const canvasOffsetX = offsetX / this.zoomLevel;
    const canvasOffsetY = offsetY / this.zoomLevel;
    
    // Start dragging
    this.isDraggingToken = true;
    this.draggedTokenId = tokenId;
    this.dragStartX = mousePos.x;
    this.dragStartY = mousePos.y;
    // Store just the offset (not the absolute position) so token follows mouse smoothly
    this.dragStartTokenX = canvasOffsetX;
    this.dragStartTokenY = canvasOffsetY;
    
    this.setViewportCursor('grabbing');
  }
  
  /**
   * Update token position during drag
   */
  updateTokenDrag(event: MouseEvent): void {
    if (!this.mapViewport || !this.mapCanvas || this.draggedTokenId === null) return;
    
    const mousePos = this.getMousePosition(event);
    if (!mousePos) return;
    
    // Convert mouse position to base canvas coordinates
    const canvasCoords = this.gridService.viewportToCanvas(mousePos.x, mousePos.y, this.panX, this.panY, this.zoomLevel);
    
    // Update token position (subtract the offset to maintain relative position)
    const token = this.tokens.find(t => t.id === this.draggedTokenId);
    if (token) {
      token.x = canvasCoords.x - this.dragStartTokenX;
      token.y = canvasCoords.y - this.dragStartTokenY;
    }
  }
  
  /**
   * Finish dragging and snap to grid
   */
  finishTokenDrag(event: MouseEvent): void {
    if (this.draggedTokenId === null) return;
    
    const token = this.tokens.find(t => t.id === this.draggedTokenId);
    if (token) {
      // Snap to grid
      token.x = this.snapToGrid(token.x, false);
      token.y = this.snapToGrid(token.y, true);
      this.saveBattlemap();
    }
    
    // Reset drag state
    this.isDraggingToken = false;
    this.draggedTokenId = null;
    this.setViewportCursor('grab');
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

  /**
   * Handle drop event (create token from character)
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.mapViewport || !this.mapCanvas || !event.dataTransfer) return;
    
    this.removeDragOverClass();
    
    const characterData = this.parseCharacterData(event.dataTransfer);
    if (!characterData) return;
    
    const position = this.getSnappedDropPosition(event);
    if (!position) return;
    
    this.updateOrCreateTokenFromDrop(characterData, position);
    this.saveBattlemap();
  }
  
  private removeDragOverClass(): void {
    if (this.mapViewport) {
      this.mapViewport.nativeElement.classList.remove('drag-over');
    }
  }
  
  private parseCharacterData(dataTransfer: DataTransfer): { characterId: number; characterName: string; avatarUrl: string } | null {
    const data = dataTransfer.getData('application/json');
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse character data from drag event:', e);
      return null;
    }
  }
  
  private getSnappedDropPosition(event: DragEvent): { x: number; y: number } | null {
    const mousePos = this.getMousePosition(event as any);
    if (!mousePos) return null;
    
    const canvasCoords = this.gridService.viewportToCanvas(mousePos.x, mousePos.y, this.panX, this.panY, this.zoomLevel);
    return {
      x: this.snapToGrid(canvasCoords.x, false),
      y: this.snapToGrid(canvasCoords.y, true)
    };
  }
  
  private updateOrCreateTokenFromDrop(characterData: { characterId: number; characterName: string; avatarUrl: string }, position: { x: number; y: number }): void {
    const existingToken = this.tokens.find(t => t.playerName === characterData.characterName && t.playerName !== 'npc');
    
    if (existingToken) {
      this.updateExistingTokenFromDrop(existingToken, characterData, position);
    } else {
      this.createTokenFromDrop(characterData, position);
    }
  }
  
  private updateExistingTokenFromDrop(token: { id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; playerName?: string; color?: string; borderColor?: string; name?: string }, characterData: { characterId: number; characterName: string; avatarUrl: string }, position: { x: number; y: number }): void {
    token.x = position.x;
    token.y = position.y;
    token.avatarUrl = characterData.avatarUrl;
    token.playerName = characterData.characterName;
    token.name = characterData.characterName;
  }
  
  private createTokenFromDrop(characterData: { characterId: number; characterName: string; avatarUrl: string }, position: { x: number; y: number }): void {
    // Generate a unique token ID (don't use characterId as token ID)
    const tokenId = this.nextTokenId++;
    this.tokens.push({
      id: tokenId,
      x: position.x,
      y: position.y,
      isGmOnly: false,
      playerName: characterData.characterName,
      avatarUrl: characterData.avatarUrl,
      name: characterData.characterName
    });
  }

  loadTokenAvatars(): void {
    if (!this.sessionId) return;
    
    this.characterService.getAllCharacters(undefined, this.sessionId).subscribe({
      next: (characters: Character[]) => {
        const { characterMap, avatarMap } = this.buildCharacterMaps(characters);
        this.updateTokensWithCharacterData(characterMap, avatarMap);
      },
      error: (err) => {
        console.error('Error loading character avatars for tokens:', err);
      }
    });
  }
  
  private buildCharacterMaps(characters: Character[]): { characterMap: Map<string, Character>; avatarMap: Map<string, string> } {
    const characterMap = new Map<string, Character>();
    const avatarMap = new Map<string, string>();
    
    characters.forEach(char => {
      if (char.name) {
        characterMap.set(char.name, char);
        avatarMap.set(char.name, this.getAvatarUrl(char));
      }
    });
    
    return { characterMap, avatarMap };
  }
  
  private updateTokensWithCharacterData(characterMap: Map<string, Character>, avatarMap: Map<string, string>): void {
    this.tokens.forEach(token => {
      // Only update character-related data if token has a playerName that matches a character
      // NPC tokens have playerName === "npc" and should be skipped
      if (token.playerName && token.playerName !== 'npc' && characterMap.has(token.playerName)) {
        // Token has a player name - it's a player token
        const character = characterMap.get(token.playerName);
        if (character && !token.name) {
          token.name = character.name;
        }
        const avatarUrl = avatarMap.get(token.playerName);
        if (avatarUrl) {
          token.avatarUrl = avatarUrl;
        }
      }
    });
  }

  getAvatarUrl(character: Character): string {
    if (character.avatarUrl && character.avatarUrl.trim() !== '') {
      // If already a full URL, return as-is
      if (character.avatarUrl.startsWith('http://') || character.avatarUrl.startsWith('https://')) {
        return character.avatarUrl;
      }
      
      // If already contains the base API path, return as-is
      if (character.avatarUrl.startsWith(environment.apiUrl)) {
        return character.avatarUrl;
      }
      
      if (character.avatarUrl.startsWith('/')) {
        // Remove /api prefix if present, then add the base API URL
        const path = character.avatarUrl.replace(/^\/api/, '');
        return `${environment.apiUrl}${path}`;
      }
      return character.avatarUrl;
    }
    return `${environment.apiUrl}/char`;
  }
  
  getTokenAvatarUrl(avatarUrl: string | undefined): string {
    if (!avatarUrl) return '';
    
    // If already a full URL (starts with http:// or https://), return as-is
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    
    // If already contains the base API path, return as-is
    if (avatarUrl.startsWith(environment.apiUrl)) {
      return avatarUrl;
    }
    
    // If it's a relative path starting with /, construct the full URL
    if (avatarUrl.startsWith('/')) {
      // Remove /api prefix if present, then add the base API URL
      const path = avatarUrl.replace(/^\/api/, '');
      return `${environment.apiUrl}${path}`;
    }
    
    return avatarUrl;
  }
}
