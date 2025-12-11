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
  
  tokens: Array<{ id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; characterId?: number; color?: string; borderColor?: string; name?: string }> = [];
  private nextTokenId: number = 1;
  
  pendingTokenConfig: { color?: string; avatarUrl?: string; borderColor?: string; name?: string } | null = null;
  
  showTokenAppearanceDialog: boolean = false;
  editingToken: { id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; characterId?: number; color?: string; borderColor?: string; name?: string } | null = null;
  private playerCharacterId: number | null = null;
  isPlayerEditingOwnToken: boolean = false;
  
  isDraggingToken: boolean = false;
  draggedTokenId: number | null = null;
  dragStartX: number = 0;
  dragStartY: number = 0;
  dragStartTokenX: number = 0;
  dragStartTokenY: number = 0;
  
  showBackgroundImageDialog: boolean = false;
  
  mapSvgContent: SafeHtml | null = null;
  
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
          this.playerCharacterId = character.id || null;
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
      this.mapImageUrl = battlemap.mapImageUrl;
      this.loadMapSvg();
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
        if (existing && existing.avatarUrl && !newToken.avatarUrl) {
          // Preserve avatarUrl from existing token if backend doesn't have it
          newToken.avatarUrl = existing.avatarUrl;
        }
        if (existing && existing.characterId && !newToken.characterId) {
          // Preserve characterId from existing token
          newToken.characterId = existing.characterId;
        }
        return newToken;
      });
      
      this.tokens = mergedTokens;
      this.nextTokenId = Math.max(...this.tokens.map(t => t.id), 0) + 1;
      this.loadTokenAvatars();
    } else {
      this.tokens = [];
    }
    
    this.lastSavedTokenHash = tokenHash;
  }
  
  private mapDtoToToken(dto: BattlemapToken): { id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; characterId?: number; color?: string; borderColor?: string; name?: string } {
    // Map from backend JSON property names (tid, gm, url, bc) to internal names
    // Backend uses shortened property names via @JsonProperty annotations
    const tokenId = dto.tokenId ?? dto.tid ?? dto.id;
    const isGmOnly = dto.isGmOnly ?? dto.gm ?? false;
    const avatarUrl = dto.avatarUrl ?? dto.url;
    const borderColor = dto.borderColor ?? dto.bc;
    
    if (!tokenId && tokenId !== 0) {
      console.warn('Token missing tokenId/tid:', dto);
    }
    
    // tokenId is used as both the token identifier and character ID when it's a player token
    // Set characterId to tokenId so we can match it with characters later
    return {
      id: tokenId ?? 0, // Fallback to 0 if undefined, but log warning
      x: dto.x ?? 0,
      y: dto.y ?? 0,
      isGmOnly: isGmOnly,
      characterId: tokenId, // Preserve tokenId as characterId for player tokens
      avatarUrl: avatarUrl,
      color: dto.color,
      borderColor: borderColor,
      name: dto.name
    };
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
        next: () => {
          this.lastSavedTokenHash = tokenHash;
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
  
  private mapTokenToDto(token: { id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; characterId?: number; color?: string; borderColor?: string; name?: string }): BattlemapToken {
    // Map to backend JSON format using shortened property names
    // Backend uses @JsonProperty annotations: tid, gm, url, bc
    const dto: BattlemapToken = {
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
    
    return dto;
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
  
  onMouseLeave(event: MouseEvent): void {
    this.isPanning = false;
    
    if (this.isDraggingToken) {
      this.finishTokenDrag(event);
    }
    
    if (this.fogOfWarService.isPainting) {
      this.stopFogPainting();
    }
    
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
    // Open the token appearance dialog first to configure the token
    const tempTokenId = this.nextTokenId++;
    const tempToken = {
      id: tempTokenId,
      x: 0, // Will be set when placed
      y: 0, // Will be set when placed
      isGmOnly: false
    };
    
    // Clear any pending config
    this.pendingTokenConfig = null;
    
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
      return;
    }
    
    // If it's not a battlemap-image URL (e.g., external image), use img tag
    if (!this.mapImageUrl.includes('/battlemap-image')) {
      this.mapSvgContent = null;
      return;
    }
    
    // Fetch the SVG content
    this.http.get(this.mapImageUrl, { responseType: 'text' }).subscribe({
      next: (svgContent) => {
        // Bypass security since we control the backend and need SVG <image> tags to work
        // The SVG is generated by our own backend code, so it's safe
        this.mapSvgContent = this.sanitizer.bypassSecurityTrustHtml(svgContent);
      },
      error: (err) => {
        console.error('Error loading map SVG:', err);
        this.mapSvgContent = null;
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
   * Update cursor based on fog of war mode
   */
  private updateFogOfWarCursor(): void {
    if (!this.mapViewport) return;
    
    if (this.isFogOfWarMode) {
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
      this.setViewportCursor('crosshair');
    }
  }
  
  getFogButtonTitle(): string {
    if (!this.isFogOfWarMode) {
      return 'Fog of War (Right-click to choose mode)';
    }
    return this.fogMode === 'add' 
      ? 'Add Fog Mode - Click to add fog (Right-click to change)' 
      : 'Remove Fog Mode - Click to reveal areas (Right-click to change)';
  }
  
  
  onTokenContextMenu(event: MouseEvent, tokenId: number): void {
    event.preventDefault();
    event.stopPropagation();
    
    const token = this.tokens.find(t => t.id === tokenId);
    if (!token) return;
    
    if (this.isGameMaster) {
      this.isPlayerEditingOwnToken = !!token.characterId;
      this.openTokenAppearanceDialog(token);
    } else {
      if (!token.characterId || token.characterId !== this.playerCharacterId) return;
      this.isPlayerEditingOwnToken = true;
      this.openTokenAppearanceDialog(token);
    }
  }
  
  openTokenAppearanceDialog(token: { id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; characterId?: number; color?: string; borderColor?: string; name?: string }): void {
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
      if (config.name !== undefined && !token.characterId) {
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
    // Check for existing token by both id and characterId to handle tokens loaded from backend
    const existingToken = this.tokens.find(t => 
      t.id === characterData.characterId || 
      t.characterId === characterData.characterId
    );
    
    if (existingToken) {
      this.updateExistingTokenFromDrop(existingToken, characterData, position);
    } else {
      this.createTokenFromDrop(characterData, position);
    }
  }
  
  private updateExistingTokenFromDrop(token: { id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; characterId?: number; color?: string; borderColor?: string; name?: string }, characterData: { characterId: number; characterName: string; avatarUrl: string }, position: { x: number; y: number }): void {
    token.x = position.x;
    token.y = position.y;
    token.avatarUrl = characterData.avatarUrl;
    token.characterId = characterData.characterId;
    token.name = characterData.characterName;
  }
  
  private createTokenFromDrop(characterData: { characterId: number; characterName: string; avatarUrl: string }, position: { x: number; y: number }): void {
    this.tokens.push({
      id: characterData.characterId,
      x: position.x,
      y: position.y,
      isGmOnly: false,
      characterId: characterData.characterId,
      avatarUrl: characterData.avatarUrl,
      name: characterData.characterName
    });
    
    if (characterData.characterId >= this.nextTokenId) {
      this.nextTokenId = characterData.characterId + 1;
    }
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
  
  private buildCharacterMaps(characters: Character[]): { characterMap: Map<number, Character>; avatarMap: Map<number, string> } {
    const characterMap = new Map<number, Character>();
    const avatarMap = new Map<number, string>();
    
    characters.forEach(char => {
      if (char.id) {
        characterMap.set(char.id, char);
        avatarMap.set(char.id, this.getAvatarUrl(char));
      }
    });
    
    return { characterMap, avatarMap };
  }
  
  private updateTokensWithCharacterData(characterMap: Map<number, Character>, avatarMap: Map<number, string>): void {
    this.tokens.forEach(token => {
      // Check by both id and characterId to handle all cases
      const characterId = token.characterId || token.id;
      if (characterMap.has(characterId)) {
        token.characterId = characterId;
        const character = characterMap.get(characterId);
        if (character && !token.name) {
          token.name = character.name;
        }
        // Always update avatarUrl from character for character tokens
        // This ensures tokens always have the correct avatar, even after polling updates
        const avatarUrl = avatarMap.get(characterId);
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
