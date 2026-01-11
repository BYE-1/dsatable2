import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EnvironmentObject } from '../../models/environment-object.model';
import { EnvironmentObjectType } from '../../models/environment-object-type.model';
import { BattlemapToken } from '../../models/battlemap.model';
import { gzipSync, strToU8 } from 'fflate';

export interface BackgroundTextureInfo {
  id: number;
  name: string;
  displayName: string;
  color: string;
}

export interface BattlemapEditorData {
  gridWidth: number;
  gridHeight: number;
  cellBackgrounds?: number[]; // Array of background type IDs (0=default/green, 1=grass, 2=earth, 3=rock, 4=sand, etc.)
  cellWater?: boolean[]; // Array of booleans indicating which cells have water (row-major order)
  tokens: BattlemapToken[];
  environmentObjects: EnvironmentObject[];
}

@Component({
  selector: 'app-battlemap-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './battlemap-editor.component.html',
  styleUrl: './battlemap-editor.component.scss'
})
export class BattlemapEditorComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() initialData?: BattlemapEditorData;
  @Input() gridWidth: number = 16; // Default 16 cells (512px at 32px per cell)
  @Input() gridHeight: number = 16; // Default 16 cells (512px at 32px per cell)
  
  private readonly CELL_SIZE = 32; // Each grid cell is 32px x 32px
  
  @Output() dataChanged = new EventEmitter<BattlemapEditorData>();
  @Output() previewGenerated = new EventEmitter<string>();

  cellBackgrounds: number[] = []; // Array of background type IDs per cell (row-major order)
  cellWater: boolean[] = []; // Array of booleans indicating which cells have water (row-major order)
  environmentObjects: EnvironmentObject[] = [];
  tokens: BattlemapToken[] = [];

  // Available background textures from backend
  availableBackgrounds: BackgroundTextureInfo[] = [];
  backgroundMap: Map<number, BackgroundTextureInfo> = new Map();
  backgroundNameMap: Map<string, number> = new Map(); // Map name to ID
  
  // Helper methods to get background IDs by name (with fallback to IDs if not loaded)
  private getBackgroundIdByName(name: string): number | null {
    return this.backgroundNameMap.get(name.toLowerCase()) ?? null;
  }

  private getDefaultBackgroundId(): number {
    // Try to find 'default' background, otherwise use first available
    const defaultId = this.getBackgroundIdByName('default');
    if (defaultId !== null) return defaultId;
    if (this.availableBackgrounds.length > 0) {
      return this.availableBackgrounds[0].id;
    }
    // Fallback to 0 if nothing loaded yet
    return 0;
  }
  
  // Get all available background IDs (including dynamic ones)
  get availableBackgroundIds(): number[] {
    return this.availableBackgrounds.map(bg => bg.id).sort((a, b) => a - b);
  }

  nextObjectId: number = 1;

  // Available object types from API
  availableObjectTypes: EnvironmentObjectType[] = [];
  defaultColors: { [key: string]: string } = {};

  // Adding new object
  newObjectType: string = 'tree';
  newObjectColor: string = '#228B22';
  newObjectSize: number = 80;

  // Preview
  previewUrl: string = '';
  previewSvgContent: string = '';
  private previewUpdateTimeout: any = null;
  @ViewChild('previewSvgContainer', { static: false }) previewSvgContainer?: ElementRef<HTMLDivElement>;

  // Selection
  selectedObjectId: number | null = null;

  // Dialog state
  showAddObjectDialog: boolean = false;

  // Grid
  showGrid: boolean = true;

  // Brush tool for painting backgrounds
  selectedBackgroundType: number = 0; // Will be updated when backgrounds load
  isBrushActive: boolean = false;

  // Random map generation
  selectedMapType: string = 'forest';
  private isPainting: boolean = false;
  showBrushMenu: boolean = false;
  brushMenuPosition: { x: number; y: number } = { x: 0, y: 0 };
  private fillToolMenuOpen: boolean = false; // Track if menu was opened from fill tool

  // Water tool
  isWaterToolActive: boolean = false;
  waterToolMode: 'add' | 'remove' = 'add'; // 'add' for left-click, 'remove' for right-click
  private isWaterPainting: boolean = false;
  showWaterModeMenu: boolean = false;
  waterModeMenuPosition: { x: number; y: number } = { x: 0, y: 0 };

  // Drag and drop
  private draggedObjectType: { type: string; color: string; size: number } | null = null;
  private dropInProgress: boolean = false;

  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.loadObjectTypes();
    this.loadBackgroundTextures();
    this.updatePreview();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle changes to initialData after component initialization
    if (changes['initialData'] && !changes['initialData'].firstChange) {
      this.loadInitialData();
      this.updatePreview();
    }
  }

  private loadInitialData(): void {
    if (this.initialData) {
      // Handle migration from old canvasWidth/canvasHeight to grid dimensions
      if (this.initialData.gridWidth && this.initialData.gridHeight) {
        this.gridWidth = this.initialData.gridWidth;
        this.gridHeight = this.initialData.gridHeight;
      } else if ((this.initialData as any).canvasWidth && (this.initialData as any).canvasHeight) {
        // Convert old pixel dimensions to grid cells (assuming 32px per cell)
        this.gridWidth = Math.round((this.initialData as any).canvasWidth / this.CELL_SIZE) || 16;
        this.gridHeight = Math.round((this.initialData as any).canvasHeight / this.CELL_SIZE) || 16;
      }
      // Handle cell backgrounds - initialize if not present
      if (this.initialData.cellBackgrounds && this.initialData.cellBackgrounds.length > 0) {
        this.cellBackgrounds = [...this.initialData.cellBackgrounds];
      } else {
        // Initialize all cells to default
        this.cellBackgrounds = new Array(this.gridWidth * this.gridHeight).fill(this.getDefaultBackgroundId());
      }
      
      // Handle cell water - initialize if not present
      const expectedWaterSize = this.gridWidth * this.gridHeight;
      if (this.initialData.cellWater && this.initialData.cellWater.length === expectedWaterSize) {
        // Use water data from initial data if it matches grid size
        this.cellWater = [...this.initialData.cellWater];
      } else {
        // Initialize all cells to no water (false)
        this.cellWater = new Array(expectedWaterSize).fill(false);
      }
      
      this.environmentObjects = this.initialData.environmentObjects || [];
      this.tokens = this.initialData.tokens || [];
      
      // Find max ID
      if (this.environmentObjects.length > 0) {
        this.nextObjectId = Math.max(...this.environmentObjects.map(o => o.id)) + 1;
      }
    } else {
      // Initialize with default backgrounds
      this.cellBackgrounds = new Array(this.gridWidth * this.gridHeight).fill(this.getDefaultBackgroundId());
      // Initialize with no water
      this.cellWater = new Array(this.gridWidth * this.gridHeight).fill(false);
    }
  }
  
  loadBackgroundTextures(): void {
    this.http.get<BackgroundTextureInfo[]>(`${environment.apiUrl}/battlemap-image/backgrounds`).subscribe({
      next: (backgrounds) => {
        this.availableBackgrounds = backgrounds;
        // Create maps for quick lookup by ID and name
        this.backgroundMap.clear();
        this.backgroundNameMap.clear();
        backgrounds.forEach(bg => {
          this.backgroundMap.set(bg.id, bg);
          if (bg.name) {
            this.backgroundNameMap.set(bg.name.toLowerCase(), bg.id);
          }
        });
        // Ensure default is selected if available
        if (this.availableBackgrounds.length > 0 && !this.backgroundMap.has(this.selectedBackgroundType)) {
          this.selectedBackgroundType = this.getDefaultBackgroundId();
        }
      },
      error: (err) => {
        console.error('Error loading background textures:', err);
        // Fallback to hardcoded backgrounds if API fails
        this.availableBackgrounds = [
          { id: 0, name: 'default', displayName: 'Default', color: '#228B22' },
          { id: 1, name: 'grass', displayName: 'Grass', color: '#90EE90' },
          { id: 2, name: 'earth', displayName: 'Earth', color: '#8B4513' },
          { id: 3, name: 'stone', displayName: 'Rock', color: '#696969' },
          { id: 4, name: 'sand', displayName: 'Sand', color: '#F4A460' }
        ];
        this.backgroundMap.clear();
        this.backgroundNameMap.clear();
        this.availableBackgrounds.forEach(bg => {
          this.backgroundMap.set(bg.id, bg);
          if (bg.name) {
            this.backgroundNameMap.set(bg.name.toLowerCase(), bg.id);
          }
        });
      }
    });
  }

  loadObjectTypes(): void {
    this.http.get<EnvironmentObjectType[]>(`${environment.apiUrl}/env-object/types`).subscribe({
      next: (types) => {
        this.availableObjectTypes = types;
        // Build default colors map
        types.forEach(type => {
          this.defaultColors[type.type] = type.defaultColor;
        });
        // Set default for new object
        if (types.length > 0) {
          this.newObjectType = types[0].type;
          this.newObjectColor = types[0].defaultColor;
          this.newObjectSize = types[0].defaultSize;
        }
      },
      error: (err) => {
        console.error('Failed to load object types:', err);
        // Fallback to hardcoded types
        this.availableObjectTypes = [
          { type: 'tree', label: 'Tree', defaultColor: '#228B22', defaultSize: 80 },
          { type: 'stone', label: 'Stone', defaultColor: '#696969', defaultSize: 80 },
          { type: 'house', label: 'House', defaultColor: '#D2691E', defaultSize: 80 }
        ];
        this.defaultColors = {
          tree: '#228B22',
          stone: '#696969',
          house: '#D2691E'
        };
      }
    });
  }

  onGridSizeChange(): void {
    // Resize cellBackgrounds array when grid size changes
    const oldSize = this.cellBackgrounds.length;
    const newSize = this.gridWidth * this.gridHeight;
    
    if (newSize > oldSize) {
      // Grid grew - fill new cells with default
      this.cellBackgrounds = [...this.cellBackgrounds, ...new Array(newSize - oldSize).fill(this.getDefaultBackgroundId())];
      // Also resize cellWater array
      if (this.cellWater.length > 0) {
        this.cellWater = [...this.cellWater, ...new Array(newSize - oldSize).fill(false)];
      } else {
        this.cellWater = new Array(newSize).fill(false);
      }
    } else if (newSize < oldSize) {
      // Grid shrunk - trim array
      this.cellBackgrounds = this.cellBackgrounds.slice(0, newSize);
      if (this.cellWater.length > 0) {
        this.cellWater = this.cellWater.slice(0, newSize);
      }
    }
    
    this.updatePreview();
    this.emitDataChanged();
  }
  
  // Helper methods to calculate pixel dimensions from grid
  get canvasWidth(): number {
    return this.gridWidth * this.CELL_SIZE;
  }
  
  get canvasHeight(): number {
    return this.gridHeight * this.CELL_SIZE;
  }

  openAddObjectDialog(): void {
    this.showAddObjectDialog = true;
  }

  closeAddObjectDialog(): void {
    this.showAddObjectDialog = false;
    this.resetNewObjectForm();
  }

  addObject(): void {
    const newObject: EnvironmentObject = {
      id: this.nextObjectId++,
      type: this.newObjectType as any,
      x: (this.gridWidth * this.CELL_SIZE) / 2,
      y: (this.gridHeight * this.CELL_SIZE) / 2,
      color: this.newObjectColor,
      size: this.newObjectSize
    };

    // Use spread to create new array reference for better change detection
    this.environmentObjects = [...this.environmentObjects, newObject];
    this.selectedObjectId = newObject.id; // Select the newly added object
    this.resetNewObjectForm();
    this.showAddObjectDialog = false;
    
    // Update preview immediately (not debounced) when adding object
    // Use setTimeout to ensure array change is processed first
    setTimeout(() => {
      this.updatePreview();
    }, 0);
    this.emitDataChanged();
  }

  removeObject(id: number): void {
    this.environmentObjects = this.environmentObjects.filter(o => o.id !== id);
    this.updatePreview();
    this.emitDataChanged();
  }

  selectObject(id: number): void {
    // Deactivate brush and water tool when selecting an object
    this.isBrushActive = false;
    this.isWaterToolActive = false;
    this.selectedObjectId = this.selectedObjectId === id ? null : id;
    // Update preview to show/hide highlight
    if (this.previewSvgContent) {
      this.updateSvgContainer();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Close brush menu if clicking outside
    if (this.showBrushMenu && !target.closest('.brush-menu') && !target.closest('.brush-toggle-btn')) {
      this.showBrushMenu = false;
    }
    
    // Deselect if clicking outside the preview container
    if (this.selectedObjectId !== null && this.previewSvgContainer?.nativeElement) {
      const container = this.previewSvgContainer.nativeElement;
      // Check if click is outside the preview container and not in the objects list
      if (!container.contains(target) && !target.closest('.objects-list')) {
        this.selectedObjectId = null;
        if (this.previewSvgContent) {
          this.updateSvgContainer();
        }
      }
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  onPreviewClick(event: MouseEvent): void {
    // Don't handle clicks if brush is active (brush uses mousedown/mousemove)
    if (this.isBrushActive) {
      return;
    }
    
    // Stop event propagation to prevent document click handler from deselecting
    event.stopPropagation();
    if (this.selectedObjectId && this.previewSvgContainer?.nativeElement) {
      this.placeObjectAtPosition(event, this.selectedObjectId);
    }
  }

  onDragStart(event: DragEvent, objectType: EnvironmentObjectType): void {
    // Reset drop flag
    this.dropInProgress = false;
    
    // Deactivate brush when starting a drag to prevent conflicts
    if (this.isBrushActive) {
      this.isBrushActive = false;
      this.isPainting = false;
    }
    
    const dragData = {
      type: objectType.type,
      color: objectType.defaultColor,
      size: objectType.defaultSize
    };
    
    // Store in component property first (most reliable)
    this.draggedObjectType = dragData;
    console.log('onDragStart - stored draggedObjectType:', this.draggedObjectType);
    
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      // Prevent default image drag behavior
      if (event.dataTransfer.setDragImage) {
        // Create a transparent 1x1 pixel image to use as drag image
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        event.dataTransfer.setDragImage(img, 0, 0);
      }
      // Store in both dataTransfer formats as well
      try {
        event.dataTransfer.setData('application/json', JSON.stringify(dragData));
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData)); // Fallback format
      } catch (e) {
        console.warn('Failed to set drag data in dataTransfer:', e);
      }
    }
  }

  onDragEnd(event: DragEvent): void {
    // Don't clear immediately - onDrop might need it
    // Use a longer delay to ensure onDrop has time to execute first
    setTimeout(() => {
      if (this.draggedObjectType) {
        // Only clear if still present (means drop didn't happen or already processed)
        this.draggedObjectType = null;
      }
    }, 200);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Stop any brush painting during drag over
    if (this.isPainting) {
      this.isPainting = false;
    }
    
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Stop any brush painting that might be in progress
    this.isPainting = false;
    
    // Set flag immediately to prevent onDragEnd from clearing
    this.dropInProgress = true;
    
    // Immediately capture the dragged object type before anything else can interfere
    const dragData = this.draggedObjectType ? { ...this.draggedObjectType } : null;

    if (!dragData && event.dataTransfer) {
      // Fallback to dataTransfer, but validate it's JSON first
      try {
        const jsonData = event.dataTransfer.getData('application/json');
        if (jsonData && jsonData.trim() && jsonData.trim().startsWith('{')) {
          const parsed = JSON.parse(jsonData);
          if (parsed && parsed.type) {
            this.placeObjectAtPosition(event, null, parsed.type, parsed.color, parsed.size);
            this.draggedObjectType = null;
            this.dropInProgress = false;
            return;
          }
        } else {
          // Fallback to text/plain format, but validate it's JSON
          const textData = event.dataTransfer.getData('text/plain');
          if (textData && textData.trim() && textData.trim().startsWith('{')) {
            const parsed = JSON.parse(textData);
            if (parsed && parsed.type) {
              this.placeObjectAtPosition(event, null, parsed.type, parsed.color, parsed.size);
              this.draggedObjectType = null;
              this.dropInProgress = false;
              return;
            }
          }
        }
      } catch (err) {
        // Silently ignore - dataTransfer might contain image URL or other non-JSON data
      }
    }

    if (dragData) {
      this.placeObjectAtPosition(event, null, dragData.type, dragData.color, dragData.size);
      // Clear dragged object type after successful drop
      this.draggedObjectType = null;
    } else {
      console.error('No drag data available. draggedObjectType:', this.draggedObjectType);
    }
    
    this.dropInProgress = false;
  }

  // Brush tool methods
  selectBackgroundType(bgType: number): void {
    console.log('Selecting background type:', bgType, 'Current brush active:', this.isBrushActive);
    this.selectedBackgroundType = bgType;
    this.isBrushActive = true;
    this.isWaterToolActive = false; // Deactivate water tool when activating brush
    // Deselect object when activating brush
    if (this.selectedObjectId !== null) {
      this.selectedObjectId = null;
    }
    console.log('Brush activated. isBrushActive:', this.isBrushActive);
  }

  // Water tool methods
  toggleWaterTool(): void {
    this.isWaterToolActive = !this.isWaterToolActive;
    if (this.isWaterToolActive) {
      this.isBrushActive = false; // Deactivate brush when activating water tool
      // Deselect object when activating water tool
      if (this.selectedObjectId !== null) {
        this.selectedObjectId = null;
      }
    } else {
      this.showWaterModeMenu = false; // Hide menu when deactivating tool
    }
  }

  showWaterModeContextMenu(event: MouseEvent): void {
    if (!this.isWaterToolActive) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    
    // Show context menu at mouse position
    this.waterModeMenuPosition = {
      x: event.clientX,
      y: event.clientY
    };
    this.showWaterModeMenu = true;
  }

  toggleWaterMode(): void {
    this.waterToolMode = this.waterToolMode === 'add' ? 'remove' : 'add';
    this.showWaterModeMenu = false; // Close menu after selection
  }

  getBackgroundTypeName(bgType: number): string {
    const bgInfo = this.backgroundMap.get(bgType);
    if (bgInfo) {
      return bgInfo.displayName;
    }
    // Fallback if not found
    return `Background ${bgType}`;
  }

  getBackgroundTypeColor(bgType: number): string {
    const bgInfo = this.backgroundMap.get(bgType);
    if (bgInfo) {
      return bgInfo.color;
    }
    // Fallback if not found
    return '#808080'; // Gray fallback
  }

  // Convert mouse event to grid cell coordinates
  private getCellFromMouseEvent(event: MouseEvent): { col: number; row: number } | null {
    if (!this.previewSvgContainer?.nativeElement) {
      return null;
    }

    const container = this.previewSvgContainer.nativeElement;
    const svg = container.querySelector('svg') as SVGSVGElement | null;
    if (!svg) {
      return null;
    }

    // Ensure SVG is fully rendered (has dimensions)
    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width === 0 || svgRect.height === 0) {
      console.warn('SVG has zero dimensions, may not be fully rendered');
      return null;
    }

    // Use SVG's built-in coordinate transformation for accurate positioning
    // This properly handles scaling, transforms, and viewBox
    let svgPoint: SVGPoint;
    try {
      svgPoint = svg.createSVGPoint();
      svgPoint.x = event.clientX;
      svgPoint.y = event.clientY;
      
      // Transform point from screen coordinates to SVG coordinates
      const ctm = svg.getScreenCTM();
      if (ctm) {
        svgPoint = svgPoint.matrixTransform(ctm.inverse());
      } else {
        // Fallback if CTM is not available
        const svgWidth = parseFloat(svg.getAttribute('width') || String(this.gridWidth * this.CELL_SIZE));
        const svgHeight = parseFloat(svg.getAttribute('height') || String(this.gridHeight * this.CELL_SIZE));
        const mouseX = event.clientX - svgRect.left;
        const mouseY = event.clientY - svgRect.top;
        const scaleX = svgWidth / svgRect.width;
        const scaleY = svgHeight / svgRect.height;
        svgPoint.x = mouseX * scaleX;
        svgPoint.y = mouseY * scaleY;
      }
    } catch (e) {
      // Fallback calculation if SVG coordinate transformation fails
      const svgWidth = parseFloat(svg.getAttribute('width') || String(this.gridWidth * this.CELL_SIZE));
      const svgHeight = parseFloat(svg.getAttribute('height') || String(this.gridHeight * this.CELL_SIZE));
      const mouseX = event.clientX - svgRect.left;
      const mouseY = event.clientY - svgRect.top;
      const scaleX = svgWidth / svgRect.width;
      const scaleY = svgHeight / svgRect.height;
      svgPoint = { x: mouseX * scaleX, y: mouseY * scaleY } as SVGPoint;
    }

    // Convert to grid cell coordinates (each cell is 32x32px in SVG coordinates)
    const col = Math.floor(svgPoint.x / this.CELL_SIZE);
    const row = Math.floor(svgPoint.y / this.CELL_SIZE);

    // Check bounds
    if (col < 0 || col >= this.gridWidth || row < 0 || row >= this.gridHeight) {
      return null;
    }

    return { col, row };
  }

  // Paint a cell with the selected background type
  private paintCell(col: number, row: number): void {
    const index = row * this.gridWidth + col;
    if (index >= 0 && index < this.cellBackgrounds.length) {
      if (this.cellBackgrounds[index] !== this.selectedBackgroundType) {
        // Update cell background - create new array for change detection
        const newBackgrounds = [...this.cellBackgrounds];
        newBackgrounds[index] = this.selectedBackgroundType;
        this.cellBackgrounds = newBackgrounds;
        // Don't update preview during painting - will update when painting stops
        // This prevents SVG re-rendering which can cause coordinate calculation issues
        this.emitDataChanged();
      }
    }
  }

  // Paint water on a cell (add or remove based on mode)
  private paintWaterCell(col: number, row: number, addWater: boolean): void {
    const index = row * this.gridWidth + col;
    if (index >= 0 && index < this.cellWater.length) {
      if (this.cellWater[index] !== addWater) {
        // Update cell water - create new array for change detection
        const newWater = [...this.cellWater];
        newWater[index] = addWater;
        this.cellWater = newWater;
        // Don't update preview during painting - will update when painting stops
        this.emitDataChanged();
      }
    }
  }

  onPreviewMouseDown(event: MouseEvent): void {
    // Don't handle brush painting if a drag is in progress
    if (this.draggedObjectType !== null || this.dropInProgress) {
      return;
    }

    // Handle water tool (uses configurable mode)
    if (this.isWaterToolActive) {
      // Don't handle clicks on child elements (like the hint or grid controls)
      if ((event.target as HTMLElement).closest('.selection-hint, .grid-control')) {
        return;
      }

      // Only handle left mouse button for water tool
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.isWaterPainting = true;
      
      const addWater = this.waterToolMode === 'add';
      const cell = this.getCellFromMouseEvent(event);
      if (cell) {
        this.paintWaterCell(cell.col, cell.row, addWater);
      }
      return;
    }

    // Only handle left mouse button for brush
    if (event.button !== 0 || !this.isBrushActive) {
      console.log('MouseDown ignored - button:', event.button, 'isBrushActive:', this.isBrushActive);
      return;
    }

    // Don't handle clicks on child elements (like the hint or grid controls)
    if ((event.target as HTMLElement).closest('.selection-hint, .grid-control')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.isPainting = true;
    console.log('Painting started');

    const cell = this.getCellFromMouseEvent(event);
    console.log('MouseDown cell:', cell);
    if (cell) {
      this.paintCell(cell.col, cell.row);
    }
  }

  onPreviewMouseMove(event: MouseEvent): void {
    // Don't handle brush painting if a drag is in progress
    if (this.draggedObjectType !== null || this.dropInProgress) {
      return;
    }

    // Handle water tool painting
    if (this.isWaterPainting && this.isWaterToolActive) {
      // Only handle left mouse button
      if (event.buttons !== 1) {
        return;
      }
      
      event.preventDefault();
      const addWater = this.waterToolMode === 'add';
      const cell = this.getCellFromMouseEvent(event);
      if (cell) {
        this.paintWaterCell(cell.col, cell.row, addWater);
      }
      return;
    }

    if (!this.isPainting || !this.isBrushActive) {
      return;
    }

    event.preventDefault();
    const cell = this.getCellFromMouseEvent(event);
    if (cell) {
      this.paintCell(cell.col, cell.row);
    }
  }

  onPreviewMouseUp(event: MouseEvent): void {
    // Handle water tool
    if (this.isWaterPainting && (event.button === 0 || event.button === 2)) {
      this.isWaterPainting = false;
      // Force immediate preview update when painting stops
      if (this.isWaterToolActive) {
        setTimeout(() => {
          this.updatePreview();
        }, 0);
      }
    }
    
    if (event.button === 0 && this.isPainting) {
      this.isPainting = false;
      // Force immediate preview update when painting stops
      if (this.isBrushActive) {
        // Use setTimeout to ensure SVG is stable before updating
        setTimeout(() => {
          this.updatePreview();
        }, 0);
      }
    }
  }

  onPreviewMouseLeave(event: MouseEvent): void {
    // Handle water tool
    if (this.isWaterPainting) {
      this.isWaterPainting = false;
      if (this.isWaterToolActive) {
        setTimeout(() => {
          this.updatePreview();
        }, 0);
      }
    }
    
    if (this.isPainting) {
      this.isPainting = false;
      // Force immediate preview update when mouse leaves
      if (this.isBrushActive) {
        // Use setTimeout to ensure SVG is stable before updating
        setTimeout(() => {
          this.updatePreview();
        }, 0);
      }
    }
  }

  private placeObjectAtPosition(
    event: MouseEvent | DragEvent,
    existingObjectId: number | null = null,
    objectType?: string,
    objectColor?: string,
    objectSize?: number
  ): void {
    // Don't handle object placement if brush or water tool is active
    if (this.isBrushActive || this.isWaterToolActive) {
      return;
    }

    if (!this.previewSvgContainer?.nativeElement) {
      return;
    }

    // Don't handle clicks on child elements (like the hint)
    if ((event.target as HTMLElement).closest('.selection-hint')) {
      return;
    }

    const container = this.previewSvgContainer.nativeElement;
    const svg = container.querySelector('svg');
    if (!svg) {
      return;
    }

    // Get click position relative to the container
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Get SVG dimensions and actual displayed size
    const svgRect = svg.getBoundingClientRect();
    const svgWidth = parseFloat(svg.getAttribute('width') || String(this.gridWidth * this.CELL_SIZE));
    const svgHeight = parseFloat(svg.getAttribute('height') || String(this.gridHeight * this.CELL_SIZE));
    
    // Calculate scale factors based on actual displayed size
    const scaleX = svgWidth / svgRect.width;
    const scaleY = svgHeight / svgRect.height;

    // Calculate offset from container to SVG
    const offsetX = svgRect.left - rect.left;
    const offsetY = svgRect.top - rect.top;

    // Convert click coordinates to SVG coordinates
    const svgX = (clickX - offsetX) * scaleX;
    const svgY = (clickY - offsetY) * scaleY;

    // Clamp to canvas bounds
    const clampedX = Math.max(0, Math.min(svgX, this.gridWidth * this.CELL_SIZE));
    const clampedY = Math.max(0, Math.min(svgY, this.gridHeight * this.CELL_SIZE));

    if (existingObjectId !== null) {
      // Update selected object position
      this.updateObjectPosition(existingObjectId, clampedX, clampedY);
    } else if (objectType) {
      // Create new object from drag and drop
      const obj: EnvironmentObject = {
        id: this.nextObjectId++,
        type: objectType as any,
        x: clampedX,
        y: clampedY,
        color: objectColor || this.defaultColors[objectType] || '#228B22',
        size: objectSize || 80
      };
      this.environmentObjects = [...this.environmentObjects, obj]; // Use spread to ensure array reference change
      this.selectedObjectId = obj.id;
      // Use setTimeout to ensure Angular processes the array change before updating preview
      setTimeout(() => {
        this.updatePreview();
      }, 0);
      this.emitDataChanged();
    }
  }

  getObjectTypeByType(type: string): EnvironmentObjectType | undefined {
    return this.availableObjectTypes.find(t => t.type === type);
  }

  updateObjectPosition(id: number, x: number, y: number): void {
    const obj = this.environmentObjects.find(o => o.id === id);
    if (obj) {
      obj.x = x;
      obj.y = y;
      this.debouncedUpdatePreview();
      this.emitDataChanged();
    }
  }

  updateObjectProperty(id: number, property: keyof EnvironmentObject, value: any): void {
    const obj = this.environmentObjects.find(o => o.id === id);
    if (obj) {
      (obj as any)[property] = value;
      this.debouncedUpdatePreview();
      this.emitDataChanged();
    }
  }

  private debouncedUpdatePreview(): void {
    // Don't update preview while actively painting (will update when painting stops)
    if (this.isPainting) {
      return;
    }
    
    // Clear any pending update
    if (this.previewUpdateTimeout) {
      clearTimeout(this.previewUpdateTimeout);
    }
    // Update preview after a short delay to avoid too many rapid updates
    // Increase delay to reduce flickering when repositioning
    this.previewUpdateTimeout = setTimeout(() => {
      this.updatePreview();
      this.previewUpdateTimeout = null;
    }, 500);
  }

  onObjectTypeChange(type: string): void {
    this.newObjectType = type;
    const objType = this.availableObjectTypes.find(t => t.type === type);
    if (objType) {
      this.newObjectColor = objType.defaultColor;
      this.newObjectSize = objType.defaultSize;
    } else {
      this.newObjectColor = this.defaultColors[type] || '#228B22';
    }
  }

  resetNewObjectForm(): void {
    this.newObjectType = 'tree';
    this.newObjectColor = this.defaultColors['tree'];
    this.newObjectSize = 80;
  }

  getObjectTypeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  getPreviewUrl(): string {
    if (!this.previewUrl) {
      return '';
    }
    return this.previewUrl;
  }

  updatePreview(): void {
    // Convert environment objects to tokens format for the battlemap image endpoint
    // Optimize: use relative URLs, short field names, and omit redundant/default fields
    const mapTokens: any[] = [
      // Regular tokens - use short field names and only include non-default fields
      ...this.tokens.map(token => {
        const optimized: any = {
          id: token.id,
          tid: token.tokenId,
          x: token.x,
          y: token.y
        };
        // Only include non-default/optional fields with short names
        if (token.isGmOnly) optimized.gm = true;
        if (token.color) optimized.color = token.color;
        if (token.avatarUrl) optimized.url = token.avatarUrl;
        if (token.borderColor) optimized.bc = token.borderColor;
        if (token.name) optimized.name = token.name;
        return optimized;
      }),
      // Environment objects - send properties instead of URLs (backend will reconstruct)
      ...this.environmentObjects.map(obj => {
        const optimized: any = {
          id: obj.id,
          tid: obj.id,
          x: obj.x,
          y: obj.y,
          et: obj.type,  // envType
        };
        // Only include color and size if they differ from defaults
        if (obj.color) optimized.ec = obj.color;  // envColor
        if (obj.size) optimized.es = obj.size;    // envSize
        // Omit url, isGmOnly (defaults to false), name (derived from type)
        return optimized;
      })
    ];

    // Optimize data structure: use short field names, omit null/undefined
    const data: any = {
      gw: this.gridWidth,  // Grid width in cells
      gh: this.gridHeight, // Grid height in cells
      ts: mapTokens // "ts" for tokens
    };
    
    // Include cell backgrounds in packed form (two nibbles per byte) only if varied
    const defaultBgId = this.getDefaultBackgroundId();
    const hasVariation = this.cellBackgrounds.some(bg => bg !== defaultBgId);
    if (hasVariation && this.cellBackgrounds.length > 0) {
      const packed = this.packBackgrounds(this.cellBackgrounds, this.gridWidth, this.gridHeight);
      data.bgp = this.uint8ToBase64(packed); // "bgp" = packed backgrounds
    }
    
    // Include cell water (packed as bits) only if there's any water
    const hasWater = this.cellWater.some(w => w);
    if (hasWater && this.cellWater.length > 0) {
      const packedWater = this.packWater(this.cellWater, this.gridWidth, this.gridHeight);
      data.wp = this.uint8ToBase64(packedWater); // "wp" = packed water
    }

    try {
      // Use compact JSON (no spacing) and remove undefined/null values
      console.log('Data object before stringify:', JSON.stringify(data, null, 2));
      const jsonString = JSON.stringify(data, (key, value) => {
        // Remove undefined values (null stays to explicitly indicate absence)
        return value === undefined ? undefined : value;
      });
      console.log('JSON string being encoded:', jsonString);

      // Compress payload (gzip) and base64-encode for the request param
      const compressed = gzipSync(strToU8(jsonString), { level: 6 });
      const base64String = this.uint8ToBase64(compressed);
      const baseUrl = `${environment.apiUrl}/battlemap-image?data=${encodeURIComponent(base64String)}`;
      
      // Force reload by adding unique cache buster - always generate new URL
      const cacheBuster = Date.now() + '_' + Math.random().toString(36).substring(7);
      const newPreviewUrl = baseUrl + '&_t=' + cacheBuster;
      
      // Always set a new URL - the cache buster ensures it's always unique
      this.previewUrl = newPreviewUrl;
      
      // Fetch and load SVG content directly to allow external resources
      this.loadPreviewSvg(newPreviewUrl);
      
      // Emit preview URL
      this.previewGenerated.emit(this.previewUrl);
    } catch (error) {
      console.error('Error generating preview:', error);
      this.previewUrl = '';
    }
  }

  ngAfterViewInit(): void {
    // Update SVG container if content is already loaded
    setTimeout(() => {
      if (this.previewSvgContent && this.previewSvgContainer) {
        this.updateSvgContainer();
      }
    }, 0);
  }

  loadPreviewSvg(url: string): void {
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(svgContent => {
        this.previewSvgContent = svgContent;
        // Use setTimeout to ensure ViewChild is available and Angular has updated the DOM
        setTimeout(() => {
          this.updateSvgContainer();
        }, 0);
      })
      .catch(error => {
        console.error('Failed to load preview SVG:', error);
        // Don't clear existing content on error - keep showing previous state
      });
  }

  updateSvgContainer(): void {
    if (this.previewSvgContainer?.nativeElement) {
      if (this.previewSvgContent) {
        // Combine battlemap SVG with grid if enabled
        let finalSvg = this.previewSvgContent;
        if (this.showGrid) {
          finalSvg = this.addGridToSvg(finalSvg);
        }
        
        // Add highlight for selected object
        if (this.selectedObjectId !== null) {
          finalSvg = this.addHighlightToSvg(finalSvg, this.selectedObjectId);
        }
        
        // Only update if content actually changed to avoid unnecessary re-rendering
        const currentContent = this.previewSvgContainer.nativeElement.innerHTML;
        if (currentContent !== finalSvg) {
          this.previewSvgContainer.nativeElement.innerHTML = finalSvg;
        }
      } else {
        this.previewSvgContainer.nativeElement.innerHTML = '';
      }
    }
  }

  private uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  private packBackgrounds(bg: number[], gridW: number, gridH: number): Uint8Array {
    // Use the same 5-bit RLE format as map-editor-page for consistency
    const totalCells = gridW * gridH;
    const output: number[] = [];
    let i = 0;
    
    const defaultBgId = this.getDefaultBackgroundId();
    while (i < totalCells) {
      const currentVal = (bg[i] ?? defaultBgId) & 0x1f; // 5 bits (0-31)
      let runLength = 1;
      
      // Check for run-length encoding opportunity (3+ consecutive identical values)
      while (i + runLength < totalCells && runLength < 255 && (bg[i + runLength] ?? defaultBgId) === currentVal) {
        runLength++;
      }
      
      if (runLength >= 3) {
        // RLE encoding: [0xFF marker, value (5 bits), count]
        output.push(0xFF);
        output.push(currentVal);
        output.push(runLength);
        i += runLength;
      } else {
        // Store individual values (1 byte each)
        for (let j = 0; j < runLength && i + j < totalCells; j++) {
          output.push((bg[i + j] ?? defaultBgId) & 0x1f);
        }
        i += runLength;
      }
    }
    
    return new Uint8Array(output);
  }

  private packWater(water: boolean[], gridW: number, gridH: number): Uint8Array {
    // Pack water as bits: 8 cells per byte
    const totalCells = gridW * gridH;
    const output: number[] = [];
    
    for (let i = 0; i < totalCells; i += 8) {
      let byte = 0;
      for (let bit = 0; bit < 8 && i + bit < totalCells; bit++) {
        if (water[i + bit]) {
          byte |= (1 << bit);
        }
      }
      output.push(byte);
    }
    
    return new Uint8Array(output);
  }

  addHighlightToSvg(svgContent: string, objectId: number): string {
    // Find the selected object
    const selectedObject = this.environmentObjects.find(obj => obj.id === objectId);
    if (!selectedObject) {
      return svgContent;
    }

    // Parse SVG to add highlight
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    
    // Get width and height from SVG
    const width = parseFloat(svgElement.getAttribute('width') || String(this.gridWidth * this.CELL_SIZE));
    const height = parseFloat(svgElement.getAttribute('height') || String(this.gridHeight * this.CELL_SIZE));
    
    // Calculate highlight size (object size + padding)
    const objectSize = selectedObject.size || 80;
    const highlightSize = objectSize + 20; // 10px padding on each side
    const highlightX = selectedObject.x - highlightSize / 2;
    const highlightY = selectedObject.y - highlightSize / 2;
    
    // Create highlight element (circle with dashed border)
    const highlight = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    highlight.setAttribute('cx', selectedObject.x.toString());
    highlight.setAttribute('cy', selectedObject.y.toString());
    highlight.setAttribute('r', (highlightSize / 2).toString());
    highlight.setAttribute('fill', 'none');
    highlight.setAttribute('stroke', '#2196F3'); // Blue color
    highlight.setAttribute('stroke-width', '3');
    highlight.setAttribute('stroke-dasharray', '5,5');
    highlight.setAttribute('opacity', '0.8');
    highlight.setAttribute('pointer-events', 'none');
    highlight.setAttribute('id', 'selected-object-highlight');
    
    // Insert highlight before closing SVG tag
    svgElement.appendChild(highlight);
    
    // Convert back to string
    return new XMLSerializer().serializeToString(svgElement);
  }

  addGridToSvg(svgContent: string): string {
    // Extract SVG viewBox or dimensions from the existing SVG
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    
    // Get width and height from SVG (should match map grid dimensions)
    const width = parseFloat(svgElement.getAttribute('width') || String(this.gridWidth * this.CELL_SIZE));
    const height = parseFloat(svgElement.getAttribute('height') || String(this.gridHeight * this.CELL_SIZE));
    
    // Generate grid lines based on actual map grid size (each cell is 32x32px)
    let gridSvg = '';
    const cellSize = this.CELL_SIZE; // 32px per cell
    
    // Draw vertical lines (one for each column + one at the end)
    for (let i = 0; i <= this.gridWidth; i++) {
      const x = i * cellSize;
      gridSvg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" ` +
                 `style="stroke:#000000;stroke-width:0.5;stroke-opacity:0.3;pointer-events:none;"/>`;
    }
    
    // Draw horizontal lines (one for each row + one at the end)
    for (let i = 0; i <= this.gridHeight; i++) {
      const y = i * cellSize;
      gridSvg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" ` +
                 `style="stroke:#000000;stroke-width:0.5;stroke-opacity:0.3;pointer-events:none;"/>`;
    }
    
    // Wrap grid in a group and add it before closing the SVG tag
    const gridGroup = `<g id="grid-overlay">${gridSvg}</g>`;
    
    // Insert grid before closing </svg> tag
    return svgContent.replace('</svg>', gridGroup + '</svg>');
  }

  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    if (this.previewSvgContent) {
      this.updateSvgContainer();
    }
  }

  showBrushContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Show context menu at mouse position
    this.brushMenuPosition = {
      x: event.clientX,
      y: event.clientY
    };
    this.fillToolMenuOpen = false;
    this.showBrushMenu = true;
  }
  
  showFillToolMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.brushMenuPosition = {
      x: event.clientX,
      y: event.clientY
    };
    this.fillToolMenuOpen = true;
    this.showBrushMenu = true;
  }

  selectBackgroundTypeFromMenu(bgType: number): void {
    this.selectBackgroundType(bgType);
    this.showBrushMenu = false;
    
    // If menu was opened from fill tool, fill the map after selection
    if (this.fillToolMenuOpen) {
      this.fillAllBackgrounds();
      this.fillToolMenuOpen = false;
    }
  }
  
  /**
   * Fill all cells with the selected background type
   */
  fillAllBackgrounds(): void {
    if (!this.cellBackgrounds || this.cellBackgrounds.length === 0) {
      return;
    }
    
    // Fill all cells with the selected background type
    this.cellBackgrounds = this.cellBackgrounds.map(() => this.selectedBackgroundType);
    
    // Emit data change and update preview
    this.emitDataChanged();
    this.updatePreview();
  }

  onShowGridChange(): void {
    // Update the SVG container to show/hide the grid
    if (this.previewSvgContent) {
      this.updateSvgContainer();
    }
  }

  getEnvironmentObjectUrl(obj: EnvironmentObject): SafeResourceUrl {
    const url = this.getEnvironmentObjectUrlString(obj);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getToolbarObjectUrl(objType: EnvironmentObjectType): SafeResourceUrl {
    const params = new URLSearchParams();
    params.set('type', objType.type);
    params.set('color', objType.defaultColor);
    params.set('size', objType.defaultSize.toString());
    const url = `${environment.apiUrl}/env-object?${params.toString()}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private getEnvironmentObjectUrlString(obj: EnvironmentObject): string {
    const params = new URLSearchParams();
    params.set('type', obj.type);
    if (obj.color) {
      params.set('color', obj.color);
    }
    if (obj.size) {
      params.set('size', obj.size.toString());
    }
    return `${environment.apiUrl}/env-object?${params.toString()}`;
  }

  emitDataChanged(): void {
    // Ensure cellWater array is properly sized
    const expectedSize = this.gridWidth * this.gridHeight;
    if (this.cellWater.length !== expectedSize) {
      // Resize to match grid
      if (this.cellWater.length < expectedSize) {
        this.cellWater = [...this.cellWater, ...new Array(expectedSize - this.cellWater.length).fill(false)];
      } else {
        this.cellWater = this.cellWater.slice(0, expectedSize);
      }
    }
    
    const data: BattlemapEditorData = {
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      cellBackgrounds: this.cellBackgrounds.length > 0 ? [...this.cellBackgrounds] : undefined,
      cellWater: this.cellWater.length > 0 && this.cellWater.some(w => w) ? [...this.cellWater] : undefined,
      tokens: this.tokens,
      environmentObjects: this.environmentObjects
    };
    this.dataChanged.emit(data);
  }

  getData(): BattlemapEditorData {
    return {
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      cellBackgrounds: this.cellBackgrounds.length > 0 ? [...this.cellBackgrounds] : undefined,
      cellWater: this.cellWater.length > 0 && this.cellWater.some(w => w) ? [...this.cellWater] : undefined,
      tokens: this.tokens,
      environmentObjects: this.environmentObjects
    };
  }

  /**
   * Generate a random map based on the selected map type
   */
  generateRandomMap(): void {
    const totalCells = this.gridWidth * this.gridHeight;
    
    // Clear existing environment objects and reset IDs
    this.environmentObjects = [];
    this.nextObjectId = 1;
    
    // Clear water
    this.cellWater = new Array(totalCells).fill(false);
    
    // Define map type configurations (using background names, will be resolved to IDs)
    const mapConfigs: {
      [key: string]: {
        backgrounds: { type: string; weight: number }[]; // type is now a name, not an ID
        objects: { type: string; min: number; max: number; spacing: number }[];
        water?: { probability: number; clusters: boolean; backgroundType?: string; edgeSide?: 'top' | 'bottom' | 'left' | 'right' }; // backgroundType is now a name
      };
    } = {
      forest: {
        backgrounds: [
          { type: 'grass', weight: 70 },
          { type: 'earth', weight: 30 }
        ],
        objects: [
          // Use multiple tree variants for variety
          { type: 'tree1', min: Math.floor(totalCells / 12), max: Math.floor(totalCells / 6), spacing: 2 },
          { type: 'tree2', min: Math.floor(totalCells / 15), max: Math.floor(totalCells / 8), spacing: 2 },
          { type: 'tree3', min: Math.floor(totalCells / 18), max: Math.floor(totalCells / 9), spacing: 2 },
          { type: 'tree4', min: Math.floor(totalCells / 20), max: Math.floor(totalCells / 10), spacing: 2 },
          { type: 'tree5', min: Math.floor(totalCells / 25), max: Math.floor(totalCells / 12), spacing: 2 },
          { type: 'stone', min: Math.floor(totalCells / 30), max: Math.floor(totalCells / 15), spacing: 3 }
        ]
      },
      beach: {
        backgrounds: [
          { type: 'sand', weight: 90 },
          { type: 'stone', weight: 10 }
        ],
        objects: [
          { type: 'stone', min: Math.floor(totalCells / 20), max: Math.floor(totalCells / 10), spacing: 3 },
          { type: 'tree1', min: 0, max: Math.floor(totalCells / 25), spacing: 4 } // Palm trees (if available)
        ],
        water: { probability: 0, clusters: false, backgroundType: 'sand', edgeSide: 'bottom' }
      },
      town: {
        backgrounds: [
          { type: 'earth', weight: 45 },
          { type: 'stone', weight: 35 },
          { type: 'brick', weight: 20 }
        ],
        objects: [
          { type: 'house', min: Math.floor(totalCells / 15), max: Math.floor(totalCells / 8), spacing: 4 },
          { type: 'tree1', min: Math.floor(totalCells / 25), max: Math.floor(totalCells / 12), spacing: 3 },
          { type: 'stone', min: Math.floor(totalCells / 30), max: Math.floor(totalCells / 20), spacing: 3 }
        ]
      },
      desert: {
        backgrounds: [
          { type: 'sand', weight: 90 },
          { type: 'stone', weight: 8 },
          { type: 'earth', weight: 2 }
        ],
        objects: [
          { type: 'stone', min: Math.floor(totalCells / 20), max: Math.floor(totalCells / 10), spacing: 4 },
          { type: 'tree1', min: 0, max: Math.floor(totalCells / 30), spacing: 5 } // Rare cacti/trees
        ]
      },
      cave: {
        backgrounds: [
          { type: 'stone', weight: 75 },
          { type: 'earth', weight: 25 }
        ],
        objects: [
          { type: 'stone', min: Math.floor(totalCells / 12), max: Math.floor(totalCells / 6), spacing: 2 },
          { type: 'tree1', min: 0, max: Math.floor(totalCells / 40), spacing: 6 } // Rare mushrooms/plants
        ]
      },
      plains: {
        backgrounds: [
          { type: 'grass', weight: 80 },
          { type: 'earth', weight: 20 }
        ],
        objects: [
          { type: 'tree1', min: Math.floor(totalCells / 20), max: Math.floor(totalCells / 10), spacing: 5 },
          { type: 'tree2', min: Math.floor(totalCells / 25), max: Math.floor(totalCells / 15), spacing: 5 },
          { type: 'stone', min: Math.floor(totalCells / 40), max: Math.floor(totalCells / 25), spacing: 4 }
        ]
      }
    };

    const config = mapConfigs[this.selectedMapType] || mapConfigs['forest'];

    // Resolve background names to IDs
    const resolvedBackgrounds: { type: number; weight: number }[] = config.backgrounds.map(bg => {
      const bgId = this.getBackgroundIdByName(bg.type);
      if (bgId === null) {
        console.warn(`Background type "${bg.type}" not found, using default`);
        return { type: this.getDefaultBackgroundId(), weight: bg.weight };
      }
      return { type: bgId, weight: bg.weight };
    });

    // Fill backgrounds based on map type
    this.fillBackgroundsByType(resolvedBackgrounds);

    // Generate water if configured
    if (config.water) {
      // Resolve water background type
      let waterBackgroundType: number | undefined;
      if (config.water.backgroundType) {
        const resolvedType = this.getBackgroundIdByName(config.water.backgroundType);
        waterBackgroundType = resolvedType ?? undefined;
      }
      this.generateWater({ ...config.water, backgroundType: waterBackgroundType }, resolvedBackgrounds);
    }

    // Place environment objects
    this.placeEnvironmentObjects(config.objects);

    // Emit data change and update preview
    this.emitDataChanged();
    this.updatePreview();
  }

  /**
   * Fill backgrounds based on weighted random distribution
   */
  private fillBackgroundsByType(backgrounds: { type: number; weight: number }[]): void {
    const totalWeight = backgrounds.reduce((sum, bg) => sum + bg.weight, 0);
    
    for (let i = 0; i < this.cellBackgrounds.length; i++) {
      const random = Math.random() * totalWeight;
      let accumulatedWeight = 0;
      
      for (const bg of backgrounds) {
        accumulatedWeight += bg.weight;
        if (random < accumulatedWeight) {
          this.cellBackgrounds[i] = bg.type;
          break;
        }
      }
      
      // Fallback to last background type if none selected (shouldn't happen, but safety check)
      if (this.cellBackgrounds[i] === undefined && backgrounds.length > 0) {
        this.cellBackgrounds[i] = backgrounds[backgrounds.length - 1].type;
      }
    }
  }

  /**
   * Generate water cells based on configuration
   * Water cells get backgrounds that match the map type's primary background
   */
  private generateWater(
    config: { probability: number; clusters: boolean; backgroundType?: number; edgeSide?: 'top' | 'bottom' | 'left' | 'right' },
    backgrounds: { type: number; weight: number }[]
  ): void {
    // Determine the background type for water cells
    // If specified, use that; otherwise use the most common background from the map type
    let waterBackgroundType: number;
    if (config.backgroundType !== undefined) {
      waterBackgroundType = config.backgroundType;
    } else {
      // Find the background type with the highest weight
      if (backgrounds.length > 0) {
        const primaryBackground = backgrounds.reduce((prev, curr) => 
          curr.weight > prev.weight ? curr : prev
        );
        waterBackgroundType = primaryBackground.type;
      } else {
        waterBackgroundType = this.getDefaultBackgroundId();
      }
    }

    // If edgeSide is specified, create water along one edge (all connected)
    if (config.edgeSide) {
      const waterDepth = Math.floor(this.gridHeight * 0.2) + Math.floor(Math.random() * Math.floor(this.gridHeight * 0.15)); // 20-35% of map height
      
      switch (config.edgeSide) {
        case 'bottom':
          // Water at the bottom edge, with some wave variation
          for (let row = this.gridHeight - waterDepth; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
              // Add slight wave variation to the water edge
              const depthFromEdge = this.gridHeight - row - 1;
              const waveVariation = Math.floor(Math.sin((col + row * 0.5) * 0.3) * 2);
              const effectiveDepth = depthFromEdge + waveVariation;
              
              if (effectiveDepth >= 0 && effectiveDepth < waterDepth + 2) {
                const index = row * this.gridWidth + col;
                if (index >= 0 && index < this.cellWater.length) {
                  this.cellWater[index] = true;
                  this.cellBackgrounds[index] = waterBackgroundType;
                }
              }
            }
          }
          break;
        case 'top':
          // Water at the top edge
          for (let row = 0; row < waterDepth; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
              const depthFromEdge = row;
              const waveVariation = Math.floor(Math.sin((col + row * 0.5) * 0.3) * 2);
              const effectiveDepth = depthFromEdge + waveVariation;
              
              if (effectiveDepth >= 0 && effectiveDepth < waterDepth + 2) {
                const index = row * this.gridWidth + col;
                if (index >= 0 && index < this.cellWater.length) {
                  this.cellWater[index] = true;
                  this.cellBackgrounds[index] = waterBackgroundType;
                }
              }
            }
          }
          break;
        case 'right':
          // Water at the right edge
          for (let col = this.gridWidth - waterDepth; col < this.gridWidth; col++) {
            for (let row = 0; row < this.gridHeight; row++) {
              const depthFromEdge = this.gridWidth - col - 1;
              const waveVariation = Math.floor(Math.sin((row + col * 0.5) * 0.3) * 2);
              const effectiveDepth = depthFromEdge + waveVariation;
              
              if (effectiveDepth >= 0 && effectiveDepth < waterDepth + 2) {
                const index = row * this.gridWidth + col;
                if (index >= 0 && index < this.cellWater.length) {
                  this.cellWater[index] = true;
                  this.cellBackgrounds[index] = waterBackgroundType;
                }
              }
            }
          }
          break;
        case 'left':
          // Water at the left edge
          for (let col = 0; col < waterDepth; col++) {
            for (let row = 0; row < this.gridHeight; row++) {
              const depthFromEdge = col;
              const waveVariation = Math.floor(Math.sin((row + col * 0.5) * 0.3) * 2);
              const effectiveDepth = depthFromEdge + waveVariation;
              
              if (effectiveDepth >= 0 && effectiveDepth < waterDepth + 2) {
                const index = row * this.gridWidth + col;
                if (index >= 0 && index < this.cellWater.length) {
                  this.cellWater[index] = true;
                  this.cellBackgrounds[index] = waterBackgroundType;
                }
              }
            }
          }
          break;
      }
    } else if (config.clusters) {
      // Create water clusters
      const numClusters = Math.floor(Math.sqrt(this.gridWidth * this.gridHeight) / 5);
      
      for (let c = 0; c < numClusters; c++) {
        const centerX = Math.floor(Math.random() * this.gridWidth);
        const centerY = Math.floor(Math.random() * this.gridHeight);
        const clusterSize = Math.floor(Math.random() * 5) + 2;
        
        for (let dy = -clusterSize; dy <= clusterSize; dy++) {
          for (let dx = -clusterSize; dx <= clusterSize; dx++) {
            const x = centerX + dx;
            const y = centerY + dy;
            
            if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= clusterSize && Math.random() < (1 - distance / clusterSize)) {
                const index = y * this.gridWidth + x;
                this.cellWater[index] = true;
                // Water cells use the appropriate background for the map type
                this.cellBackgrounds[index] = waterBackgroundType;
              }
            }
          }
        }
      }
    } else {
      // Random water placement
      for (let i = 0; i < this.cellWater.length; i++) {
        if (Math.random() < config.probability) {
          this.cellWater[i] = true;
          // Water cells use the appropriate background for the map type
          this.cellBackgrounds[i] = waterBackgroundType;
        }
      }
    }
  }

  /**
   * Place environment objects at random but reasonable locations
   */
  private placeEnvironmentObjects(
    objectConfigs: { type: string; min: number; max: number; spacing: number }[]
  ): void {
    const occupiedPositions = new Set<string>();
    
    // Helper to check if position is available (with spacing)
    const isPositionAvailable = (x: number, y: number, spacing: number): boolean => {
      for (let dy = -spacing; dy <= spacing; dy++) {
        for (let dx = -spacing; dx <= spacing; dx++) {
          const checkX = x + dx;
          const checkY = y + dy;
          if (checkX >= 0 && checkX < this.gridWidth && checkY >= 0 && checkY < this.gridHeight) {
            const key = `${checkX},${checkY}`;
            if (occupiedPositions.has(key)) {
              return false;
            }
          }
        }
      }
      return true;
    };

    // Helper to mark positions as occupied
    const markPositionOccupied = (x: number, y: number, spacing: number): void => {
      for (let dy = -spacing; dy <= spacing; dy++) {
        for (let dx = -spacing; dx <= spacing; dx++) {
          const markX = x + dx;
          const markY = y + dy;
          if (markX >= 0 && markX < this.gridWidth && markY >= 0 && markY < this.gridHeight) {
            occupiedPositions.add(`${markX},${markY}`);
          }
        }
      }
    };

    // Place objects for each type
    for (const objConfig of objectConfigs) {
      const count = Math.floor(Math.random() * (objConfig.max - objConfig.min + 1)) + objConfig.min;
      // For tree variants (tree1-tree8), use 'tree' to get default color/size
      const baseType = objConfig.type.startsWith('tree') ? 'tree' : objConfig.type;
      const defaultColor = this.defaultColors[baseType] || this.defaultColors['tree'] || '#228B22';
      const defaultSize = this.availableObjectTypes.find(t => t.type === baseType)?.defaultSize || 80;

      let placed = 0;
      let attempts = 0;
      const maxAttempts = count * 10; // Limit attempts to avoid infinite loops

      while (placed < count && attempts < maxAttempts) {
        attempts++;
        
        const x = Math.floor(Math.random() * this.gridWidth);
        const y = Math.floor(Math.random() * this.gridHeight);

        // Don't place objects in water cells
        const index = y * this.gridWidth + x;
        if (this.cellWater[index]) {
          continue;
        }

        if (isPositionAvailable(x, y, objConfig.spacing)) {
          // Place object at cell center (convert grid coordinates to pixel coordinates)
          const pixelX = x * this.CELL_SIZE + this.CELL_SIZE / 2;
          const pixelY = y * this.CELL_SIZE + this.CELL_SIZE / 2;

          this.environmentObjects.push({
            id: this.nextObjectId++,
            type: objConfig.type as any,
            x: pixelX,
            y: pixelY,
            color: defaultColor,
            size: defaultSize
          });

          markPositionOccupied(x, y, objConfig.spacing);
          placed++;
        }
      }
    }
  }
}

