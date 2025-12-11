import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BattlemapEditorComponent, BattlemapEditorData } from '../battlemap-editor/battlemap-editor.component';
import { EnvironmentObject } from '../../models/environment-object.model';
import { SavedMapsService, SavedMap } from '../../services/saved-maps.service';
import { gunzipSync, gzipSync, strToU8, unzipSync } from 'fflate';
import { Base64 } from 'js-base64';

@Component({
  selector: 'app-map-editor-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, BattlemapEditorComponent],
  template: `
    <div class="map-editor-page">
      <div class="map-editor-header">
        <div class="save-load-controls">
          <div class="save-controls">
            <input 
              type="text" 
              [(ngModel)]="saveMapName" 
              [placeholder]="'map.mapName' | translate"
              class="map-name-input"
              (keyup.enter)="saveCurrentMap()">
            <button (click)="saveCurrentMap()" [disabled]="!saveMapName || !currentDataParam || saving" class="save-btn">
              {{ saving ? ('map.saving' | translate) : ('map.saveMap' | translate) }}
            </button>
          </div>
          <div class="load-controls">
            <select [(ngModel)]="selectedMapId" (change)="loadSelectedMap()" class="map-select" [disabled]="loadingMaps">
              <option value="">{{ 'map.loadMap' | translate }}</option>
              <option *ngFor="let map of savedMaps" [value]="map.id">
                {{ map.name }} ({{ formatDate(map.updatedAt) }})
              </option>
            </select>
            <button 
              *ngIf="selectedMapId" 
              (click)="deleteSelectedMap()" 
              class="delete-btn"
              [disabled]="deleting"
              [title]="'common.delete' | translate">
              {{ deleting ? ('map.deleting' | translate) : ('common.delete' | translate) }}
            </button>
          </div>
        </div>
      </div>
      <app-battlemap-editor
        [initialData]="initialData"
        [gridWidth]="16"
        [gridHeight]="16"
        (dataChanged)="onMapDataChanged($event)"
        (previewGenerated)="onPreviewGenerated($event)">
      </app-battlemap-editor>
    </div>
  `,
  styles: [`
    .map-editor-page {
      width: 100%;
      height: 100%;
      padding: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    :host {
      height: 100%;
    }

    app-battlemap-editor {
      height: 100%;
    }

    .page-header {
      margin-bottom: 20px;
    }

    .page-header h2 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 2em;
    }

    .page-description {
      margin: 0;
      color: #666;
      font-size: 1em;
    }

    .map-editor-header {
      padding: 10px 20px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .save-load-controls {
      display: flex;
      gap: 20px;
      align-items: center;
      flex-wrap: wrap;
    }

    .save-controls, .load-controls {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .map-name-input {
      padding: 6px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      min-width: 200px;
    }

    .map-select {
      padding: 6px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      min-width: 250px;
      background: white;
    }

    .map-select:disabled {
      background: #f0f0f0;
      cursor: not-allowed;
    }

    .save-btn, .delete-btn {
      padding: 6px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .save-btn {
      background: #4CAF50;
      color: white;
    }

    .save-btn:hover:not(:disabled) {
      background: #45a049;
    }

    .save-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .delete-btn {
      background: #f44336;
      color: white;
    }

    .delete-btn:hover:not(:disabled) {
      background: #da190b;
    }

    .delete-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  `]
})
export class MapEditorPageComponent implements OnInit {
  initialData: BattlemapEditorData | undefined;
  private urlUpdateTimeout: any = null;
  
  // Save/Load functionality
  saveMapName: string = '';
  savedMaps: SavedMap[] = [];
  selectedMapId: string = '';
  currentDataParam: string = '';
  saving: boolean = false;
  loadingMaps: boolean = false;
  deleting: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private savedMapsService: SavedMapsService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    // Load saved maps list
    this.loadSavedMaps();
    
    // Read data parameter from URL
    this.route.queryParams.subscribe(params => {
      const dataParam = params['data'];
      this.currentDataParam = dataParam || '';
      if (dataParam) {
        try {
          const data = this.decodeDataParam(dataParam);
          
          // Debug: Log water data to verify it's being decoded
          if (data.cellWater) {
            const waterCount = data.cellWater.filter(w => w).length;
            console.log('Loaded water data:', { 
              totalCells: data.cellWater.length, 
              waterCells: waterCount,
              gridSize: `${data.gridWidth}x${data.gridHeight}` 
            });
          }
          
          // Handle migration from old canvasWidth/canvasHeight format
          if (data.gridWidth && data.gridHeight) {
            this.initialData = {
              gridWidth: data.gridWidth || 16,
              gridHeight: data.gridHeight || 16,
              cellBackgrounds: data.cellBackgrounds,
              cellWater: data.cellWater, // Include water data
              tokens: data.tokens || [],
              environmentObjects: data.environmentObjects || []
            };
          } else if ((data as any).canvasWidth && (data as any).canvasHeight) {
            // Convert old pixel dimensions to grid cells (32px per cell)
            this.initialData = {
              gridWidth: Math.round((data as any).canvasWidth / 32) || 16,
              gridHeight: Math.round((data as any).canvasHeight / 32) || 16,
              cellBackgrounds: data.cellBackgrounds,
              cellWater: data.cellWater, // Include water data
              tokens: data.tokens || [],
              environmentObjects: data.environmentObjects || []
            };
          } else {
            this.initialData = {
              gridWidth: 16,
              gridHeight: 16,
              cellBackgrounds: data.cellBackgrounds,
              tokens: data.tokens || [],
              environmentObjects: data.environmentObjects || []
            };
          }
        } catch (error) {
          console.error('Error decoding map data from URL:', error);
          this.initialData = undefined;
        }
      } else {
        this.initialData = undefined;
      }
    });
  }

  onMapDataChanged(data: BattlemapEditorData): void {
    // Update URL with current map data (debounced to avoid too many URL updates)
    if (this.urlUpdateTimeout) {
      clearTimeout(this.urlUpdateTimeout);
    }
    this.urlUpdateTimeout = setTimeout(() => {
      try {
        const base64String = this.encodeDataParam(data);
        this.currentDataParam = base64String;
        
        // Update URL without reloading page
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { data: base64String },
          queryParamsHandling: 'merge',
          replaceUrl: true // Use replaceUrl to avoid cluttering browser history
        });
      } catch (error) {
        console.error('Error encoding map data to URL:', error);
      }
    }, 500); // Debounce URL updates by 500ms
  }
  
  saveCurrentMap(): void {
    if (!this.saveMapName.trim() || !this.currentDataParam || this.saving) {
      return;
    }
    
    this.saving = true;
    this.savedMapsService.saveMap(this.saveMapName.trim(), this.currentDataParam).subscribe({
      next: () => {
        this.loadSavedMaps();
        this.saveMapName = ''; // Clear input after saving
        this.saving = false;
        alert(this.translateService.instant('map.mapSaved'));
      },
      error: (error) => {
        console.error('Error saving map:', error);
        this.saving = false;
        alert(this.translateService.instant('map.mapSaveFailed'));
      }
    });
  }
  
  loadSelectedMap(): void {
    if (!this.selectedMapId || this.loadingMaps) {
      return;
    }
    
    this.loadingMaps = true;
    this.savedMapsService.getMapById(Number(this.selectedMapId)).subscribe({
      next: (map) => {
        // Update URL to load the saved map
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { data: map.dataParam },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        this.loadingMaps = false;
      },
      error: (error) => {
        console.error('Error loading map:', error);
        this.loadingMaps = false;
        alert(this.translateService.instant('map.mapLoadFailed'));
      }
    });
  }
  
  deleteSelectedMap(): void {
    if (!this.selectedMapId || !confirm(this.translateService.instant('map.confirmDelete')) || this.deleting) {
      return;
    }
    
    this.deleting = true;
    this.savedMapsService.deleteMap(Number(this.selectedMapId)).subscribe({
      next: () => {
        this.loadSavedMaps();
        this.selectedMapId = '';
        this.deleting = false;
      },
      error: (error) => {
        console.error('Error deleting map:', error);
        this.deleting = false;
        alert(this.translateService.instant('map.mapDeleteFailed'));
      }
    });
  }
  
  private loadSavedMaps(): void {
    this.loadingMaps = true;
    this.savedMapsService.getAllMaps().subscribe({
      next: (maps) => {
        this.savedMaps = maps;
        this.loadingMaps = false;
      },
      error: (error) => {
        console.error('Error loading saved maps:', error);
        this.savedMaps = [];
        this.loadingMaps = false;
        // Don't show alert for this - it's okay if user isn't logged in
      }
    });
  }
  
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  onPreviewGenerated(previewUrl: string): void {
    // Preview URL is already in the component, no action needed
  }

  private encodeDataParam(data: BattlemapEditorData): string {
    const payload = this.compactData(data);
    const jsonString = JSON.stringify(payload);
    const jsonBytes = strToU8(jsonString);
    
    // Only compress if it actually reduces size (account for gzip overhead ~20-30 bytes)
    const compressed = gzipSync(jsonBytes, { level: 6 });
    if (compressed.length < jsonBytes.length - 20) {
      // Compression helps, use compressed version
      return this.uint8ToBase64(compressed);
    } else {
      // Compression doesn't help (or makes it worse), use uncompressed
      return this.uint8ToBase64(jsonBytes);
    }
  }

  private decodeDataParam(dataParam: string): BattlemapEditorData {
    const compressed = this.base64ToUint8(dataParam);
    // Try gzip first, then raw or raw deflate fallback for robustness
    // If decompression fails, assume it's uncompressed JSON
    const jsonString = this.tryGunzip(compressed) ?? this.tryUnzip(compressed) ?? new TextDecoder().decode(compressed);
    const parsed = JSON.parse(jsonString) as any;
    return this.expandData(parsed);
  }

  private tryGunzip(bytes: Uint8Array): string | null {
    try {
      const out = gunzipSync(bytes) as unknown as Uint8Array;
      return new TextDecoder().decode(out);
    } catch {
      return null;
    }
  }

  private tryUnzip(bytes: Uint8Array): string | null {
    try {
      const out = unzipSync(bytes) as unknown as Uint8Array;
      return new TextDecoder().decode(out);
    } catch {
      return null;
    }
  }

  private uint8ToBase64(bytes: Uint8Array): string {
    return Base64.fromUint8Array(bytes, true);
  }

  private base64ToUint8(base64: string): Uint8Array {
    return Base64.toUint8Array(base64);
  }

  private compactData(data: BattlemapEditorData) {
    const result: any = {
      gw: data.gridWidth,
      gh: data.gridHeight,
      ts: data.tokens ?? []
    };
    
    // Pack environment objects as binary (no id, no field names, just values)
    if (data.environmentObjects && data.environmentObjects.length > 0) {
      const packed = this.packEnvironmentObjects(data.environmentObjects);
      result.eob = Array.from(packed); // eob = environment objects binary
    }
    
    if (data.cellBackgrounds && data.cellBackgrounds.length > 0) {
      const allDefault = data.cellBackgrounds.every(v => v === 0);
      if (!allDefault) {
        // Pack backgrounds as raw bytes (array of numbers) instead of base64 string
        // This compresses much better than base64
        const packed = this.packBackgroundsToBytes(data.cellBackgrounds, data.gridWidth, data.gridHeight);
        result.bgp = Array.from(packed); // Convert Uint8Array to regular array for JSON
      }
    }
    
    // Pack water data (as bits: 8 cells per byte) only if there's any water
    if (data.cellWater && data.cellWater.length > 0) {
      const hasWater = data.cellWater.some(w => w);
      if (hasWater) {
        const packedWater = this.packWater(data.cellWater, data.gridWidth, data.gridHeight);
        result.wp = Array.from(packedWater); // "wp" = packed water
      }
    }
    
    return result;
  }

  private expandData(raw: any): BattlemapEditorData {
    const gridWidth = raw.gw ?? raw.gridWidth ?? 16;
    const gridHeight = raw.gh ?? raw.gridHeight ?? 16;
    let cellBackgrounds: number[] | undefined = raw.cellBackgrounds;
    if (!cellBackgrounds && raw.bgp) {
      // Handle both old base64 format and new array format
      if (typeof raw.bgp === 'string') {
        // Old base64 format
        cellBackgrounds = this.unpackBackgrounds(raw.bgp, gridWidth, gridHeight);
      } else if (Array.isArray(raw.bgp)) {
        // New array format (compresses better)
        cellBackgrounds = this.unpackBackgroundsFromBytes(new Uint8Array(raw.bgp), gridWidth, gridHeight);
      }
    }
    
    // Handle environment objects: new binary format (eob) or old JSON format (eo)
    let environmentObjects: EnvironmentObject[] = [];
    if (raw.eob && Array.isArray(raw.eob)) {
      // New binary format
      environmentObjects = this.unpackEnvironmentObjects(new Uint8Array(raw.eob));
    } else if (raw.eo && Array.isArray(raw.eo)) {
      // Old JSON format (backward compatibility)
      environmentObjects = raw.eo;
    } else if (raw.environmentObjects && Array.isArray(raw.environmentObjects)) {
      // Legacy format
      environmentObjects = raw.environmentObjects;
    }
    
    // Handle water data: unpack from packed format (wp) or use legacy format
    let cellWater: boolean[] | undefined = raw.cellWater;
    if (!cellWater && raw.wp) {
      if (Array.isArray(raw.wp)) {
        // New array format (packed as bits)
        cellWater = this.unpackWater(new Uint8Array(raw.wp), gridWidth, gridHeight);
      } else if (typeof raw.wp === 'string') {
        // Legacy base64 format
        const bytes = this.base64ToUint8(raw.wp);
        cellWater = this.unpackWater(bytes, gridWidth, gridHeight);
      }
    }
    
    // Ensure cellWater is always an array matching grid size (even if all false)
    // This ensures proper initialization when loading from data param
    if (!cellWater || cellWater.length !== gridWidth * gridHeight) {
      cellWater = new Array(gridWidth * gridHeight).fill(false);
    }
    
    return {
      gridWidth,
      gridHeight,
      cellBackgrounds,
      cellWater,
      tokens: raw.ts ?? raw.tokens ?? [],
      environmentObjects
    };
  }

  private packBackgroundsToBytes(bg: number[], gridW: number, gridH: number): Uint8Array {
    const totalCells = gridW * gridH;
    const output: number[] = [];
    let i = 0;
    
    while (i < totalCells) {
      const currentVal = (bg[i] ?? 0) & 0x1f; // 5 bits (0-31)
      let runLength = 1;
      
      // Check for run-length encoding opportunity (3+ consecutive identical values)
      while (i + runLength < totalCells && runLength < 255 && (bg[i + runLength] ?? 0) === currentVal) {
        runLength++;
      }
      
      if (runLength >= 3) {
        // RLE encoding: [0xFF marker, value (5 bits), count]
        // Saves space when runLength >= 3 (3 bytes vs 3+ individual bytes)
        output.push(0xFF);
        output.push(currentVal);
        output.push(runLength);
        i += runLength;
      } else {
        // Store individual values (1 byte each, but gzip will compress repeated patterns)
        // Values are limited to 0-31 (5 bits), but we use full byte for simplicity
        // The gzip compression will handle the redundancy
        for (let j = 0; j < runLength && i + j < totalCells; j++) {
          output.push((bg[i + j] ?? 0) & 0x1f);
        }
        i += runLength;
      }
    }
    
    return new Uint8Array(output);
  }

  private unpackBackgroundsFromBytes(bytes: Uint8Array, gridW: number, gridH: number): number[] {
    const totalCells = gridW * gridH;
    const result = new Array<number>(totalCells);
    let resultIdx = 0;
    let byteIdx = 0;
    
    while (resultIdx < totalCells && byteIdx < bytes.length) {
      if (bytes[byteIdx] === 0xFF && byteIdx + 2 < bytes.length) {
        // RLE decoding: [0xFF, value, count]
        const value = bytes[byteIdx + 1] & 0x1f;
        const count = bytes[byteIdx + 2];
        for (let i = 0; i < count && resultIdx < totalCells; i++) {
          result[resultIdx++] = value;
        }
        byteIdx += 3;
      } else {
        // Direct value (1 byte per cell)
        result[resultIdx++] = bytes[byteIdx++] & 0x1f;
      }
    }
    
    // Fill remaining cells with default (0)
    while (resultIdx < totalCells) {
      result[resultIdx++] = 0;
    }
    
    return result;
  }

  // Legacy methods for backward compatibility (used by battlemap-editor component)
  // Note: These still use the old 4-bit format for backward compatibility with existing URLs
  private packBackgrounds(bg: number[], gridW: number, gridH: number): string {
    // Legacy 4-bit packing (0-15) for backward compatibility
    const totalCells = gridW * gridH;
    const bytes = new Uint8Array(Math.ceil(totalCells / 2));
    for (let i = 0; i < totalCells; i++) {
      const val = (bg[i] ?? 0) & 0x0f; // 4 bits (0-15)
      const idx = i >> 1;
      if ((i & 1) === 0) {
        bytes[idx] = (bytes[idx] & 0xf0) | val;
      } else {
        bytes[idx] = (bytes[idx] & 0x0f) | (val << 4);
      }
    }
    return Base64.fromUint8Array(bytes, true);
  }

  private unpackBackgrounds(b64: string, gridW: number, gridH: number): number[] {
    // Legacy 4-bit unpacking (0-15) for backward compatibility
    const bytes = Base64.toUint8Array(b64);
    const totalCells = gridW * gridH;
    const result = new Array<number>(totalCells);
    for (let i = 0; i < totalCells; i++) {
      const idx = i >> 1;
      const b = idx < bytes.length ? bytes[idx] : 0;
      result[i] = (i & 1) === 0 ? (b & 0x0f) : ((b >> 4) & 0x0f);
    }
    return result;
  }

  // Environment object binary packing format:
  // Per object: [type(1), x(2), y(2), flags(1), color?(3), size?(1)]
  // type: 0=tree, 1=stone, 2=house
  // flags: bit 0=hasColor, bit 1=hasSize
  // x, y: uint16 little-endian
  // color: RGB (3 bytes) if hasColor flag set
  // size: 1 byte if hasSize flag set
  private packEnvironmentObjects(objects: EnvironmentObject[]): Uint8Array {
    const output: number[] = [];
    
    // Type mapping
    const typeMap: { [key: string]: number } = {
      'tree': 0,
      'stone': 1,
      'house': 2
    };
    
    for (const obj of objects) {
      // Type (1 byte)
      const typeValue = typeMap[obj.type] ?? 0;
      output.push(typeValue);
      
      // X coordinate (2 bytes, little-endian)
      const x = Math.round(obj.x) & 0xFFFF;
      output.push(x & 0xFF);
      output.push((x >> 8) & 0xFF);
      
      // Y coordinate (2 bytes, little-endian)
      const y = Math.round(obj.y) & 0xFFFF;
      output.push(y & 0xFF);
      output.push((y >> 8) & 0xFF);
      
      // Flags (1 byte): bit 0 = hasColor, bit 1 = hasSize
      let flags = 0;
      const hasColor = obj.color && obj.color !== '';
      const hasSize = obj.size !== undefined && obj.size !== null;
      
      if (hasColor) flags |= 0x01;
      if (hasSize) flags |= 0x02;
      output.push(flags);
      
      // Color (3 bytes RGB) if present
      if (hasColor && obj.color) {
        const rgb = this.hexToRgb(obj.color);
        output.push(rgb.r);
        output.push(rgb.g);
        output.push(rgb.b);
      }
      
      // Size (1 byte) if present
      if (hasSize && obj.size !== undefined) {
        output.push(Math.min(255, Math.max(0, Math.round(obj.size))));
      }
    }
    
    return new Uint8Array(output);
  }

  private unpackEnvironmentObjects(bytes: Uint8Array): EnvironmentObject[] {
    const objects: EnvironmentObject[] = [];
    const typeNames: string[] = ['tree', 'stone', 'house'];
    let byteIdx = 0;
    let objId = 1; // Generate IDs starting from 1
    
    while (byteIdx < bytes.length) {
      if (byteIdx + 5 > bytes.length) break; // Need at least 5 bytes (type, x, y, flags)
      
      // Type (1 byte)
      const typeValue = bytes[byteIdx++] & 0xFF;
      const type = typeNames[typeValue] || 'tree';
      
      // X coordinate (2 bytes, little-endian)
      const x = bytes[byteIdx++] | (bytes[byteIdx++] << 8);
      
      // Y coordinate (2 bytes, little-endian)
      const y = bytes[byteIdx++] | (bytes[byteIdx++] << 8);
      
      // Flags (1 byte)
      const flags = bytes[byteIdx++];
      const hasColor = (flags & 0x01) !== 0;
      const hasSize = (flags & 0x02) !== 0;
      
      // Color (3 bytes RGB) if present
      let color: string | undefined;
      if (hasColor) {
        if (byteIdx + 3 > bytes.length) break;
        const r = bytes[byteIdx++];
        const g = bytes[byteIdx++];
        const b = bytes[byteIdx++];
        color = this.rgbToHex(r, g, b);
      }
      
      // Size (1 byte) if present
      let size: number | undefined;
      if (hasSize) {
        if (byteIdx >= bytes.length) break;
        size = bytes[byteIdx++];
      }
      
      objects.push({
        id: objId++,
        type: type as 'tree' | 'stone' | 'house',
        x,
        y,
        color,
        size
      });
    }
    
    return objects;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    // Remove # if present
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
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

  private unpackWater(bytes: Uint8Array, gridW: number, gridH: number): boolean[] {
    // Unpack water from bits: 8 cells per byte
    const totalCells = gridW * gridH;
    const result = new Array<boolean>(totalCells).fill(false);
    let bitIndex = 0;
    
    for (const byte of bytes) {
      for (let bit = 0; bit < 8 && bitIndex < totalCells; bit++) {
        result[bitIndex++] = ((byte >> bit) & 1) === 1;
      }
    }
    
    return result;
  }
}

