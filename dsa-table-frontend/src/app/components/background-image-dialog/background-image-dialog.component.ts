import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { SavedMapsService, SavedMap } from '../../services/saved-maps.service';
import { environment } from '../../../environments/environment';

export interface BackgroundImageResult {
  imageUrl: string | undefined;
  dataParam?: string; // Optional: if provided, contains the full map data including environment objects
}

@Component({
  selector: 'app-background-image-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="dialog-overlay" (click)="onCancel()">
      <div class="dialog-content" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>{{ 'battlemap.setBackgroundImage' | translate }}</h3>
          <button class="close-btn" (click)="onCancel()" type="button">×</button>
        </div>
        
        <div class="dialog-body">
          <div class="option-selector">
            <label class="radio-option">
              <input 
                type="radio" 
                name="bgType" 
                value="url" 
                [(ngModel)]="selectedType"
                (change)="onTypeChange()">
              <span>{{ 'battlemap.backgroundUrl' | translate }}</span>
            </label>
            <label class="radio-option">
              <input 
                type="radio" 
                name="bgType" 
                value="savedMap" 
                [(ngModel)]="selectedType"
                (change)="onTypeChange()">
              <span>{{ 'battlemap.savedMap' | translate }}</span>
            </label>
          </div>

          <div *ngIf="selectedType === 'url'" class="input-section">
            <label for="imageUrl">{{ 'battlemap.imageUrl' | translate }}</label>
            <input 
              id="imageUrl"
              type="text" 
              [(ngModel)]="imageUrl"
              [placeholder]="'battlemap.imageUrlPlaceholder' | translate"
              class="url-input">
            <button 
              type="button"
              class="preview-btn"
              (click)="onPreviewUrl()"
              [disabled]="!imageUrl">
              {{ 'battlemap.preview' | translate }}
            </button>
            <div *ngIf="previewUrl || previewSvgContent" class="preview-section">
              <div 
                *ngIf="previewSvgContent" 
                [innerHTML]="previewSvgContent" 
                class="preview-image preview-svg">
              </div>
              <img 
                *ngIf="!previewSvgContent && previewUrl"
                [src]="previewUrl" 
                (error)="previewError = true" 
                (load)="previewError = false" 
                class="preview-image" 
                alt="Preview">
              <div *ngIf="previewError" class="preview-error">{{ 'battlemap.previewError' | translate }}</div>
            </div>
          </div>

          <div *ngIf="selectedType === 'savedMap'" class="input-section">
            <label for="savedMapSelect">{{ 'battlemap.selectSavedMap' | translate }}</label>
            <div *ngIf="loadingMaps" class="loading-maps">{{ 'common.loading' | translate }}...</div>
            <select 
              id="savedMapSelect"
              [ngModel]="selectedMapId"
              (ngModelChange)="onMapIdChange($event)"
              class="map-select"
              [disabled]="loadingMaps || savedMaps.length === 0">
              <option [value]="null">{{ 'battlemap.selectMapPlaceholder' | translate }}</option>
              <option *ngFor="let map of savedMaps" [value]="map.id">
                {{ map.name }}
              </option>
            </select>
            <div *ngIf="!loadingMaps && savedMaps.length === 0" class="no-maps">
              {{ 'battlemap.noSavedMaps' | translate }}
            </div>
            <div *ngIf="selectedMapId && (selectedMapPreview || selectedMapSvgContent)" class="preview-section">
              <div 
                *ngIf="selectedMapSvgContent" 
                [innerHTML]="selectedMapSvgContent" 
                class="preview-image preview-svg">
              </div>
              <img 
                *ngIf="!selectedMapSvgContent && selectedMapPreview"
                [src]="selectedMapPreview" 
                class="preview-image" 
                alt="Map preview">
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" (click)="onCancel()">
            {{ 'common.cancel' | translate }}
          </button>
          <button 
            type="button" 
            class="btn btn-primary" 
            (click)="onConfirm(); $event.stopPropagation()"
            [disabled]="!isValid()"
            [attr.aria-disabled]="!isValid()">
            {{ 'common.confirm' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .dialog-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .dialog-header h3 {
      margin: 0;
      font-size: 1.25rem;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 2rem;
      color: #666;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .close-btn:hover {
      background: #f0f0f0;
    }

    .dialog-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .option-selector {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      padding: 0.5rem 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .radio-option:hover {
      border-color: #8b7550;
      background: rgba(139, 117, 80, 0.05);
    }

    .radio-option input[type="radio"] {
      margin: 0;
    }

    .radio-option input[type="radio"]:checked + span {
      font-weight: 600;
      color: #8b7550;
    }

    .input-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .input-section label {
      font-weight: 500;
      color: #333;
      margin-bottom: 0.25rem;
    }

    .url-input {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.95rem;
    }

    .url-input:focus {
      outline: none;
      border-color: #8b7550;
      box-shadow: 0 0 0 3px rgba(139, 117, 80, 0.1);
    }

    .preview-btn {
      padding: 0.5rem 1rem;
      background: #8b7550;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      align-self: flex-start;
      transition: background 0.2s;
    }

    .preview-btn:hover:not(:disabled) {
      background: #6b5a3f;
    }

    .preview-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .map-select {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.95rem;
      background: white;
    }

    .map-select:focus {
      outline: none;
      border-color: #8b7550;
      box-shadow: 0 0 0 3px rgba(139, 117, 80, 0.1);
    }

    .loading-maps, .no-maps {
      padding: 0.75rem;
      color: #666;
      font-style: italic;
      text-align: center;
    }

    .preview-section {
      margin-top: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
      background: #f9f9f9;
    }

    .preview-image {
      max-width: 100%;
      max-height: 300px;
      border-radius: 6px;
      display: block;
      margin: 0 auto;
    }

    .preview-svg {
      max-width: 100%;
      max-height: 300px;
      border-radius: 6px;
      display: block;
      margin: 0 auto;
      
      ::ng-deep svg {
        max-width: 100%;
        max-height: 300px;
        display: block;
      }
    }

    .preview-error {
      color: #dc3545;
      text-align: center;
      padding: 0.5rem;
      font-size: 0.9rem;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .btn-primary {
      background: #8b7550;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #6b5a3f;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  `]
})
export class BackgroundImageDialogComponent implements OnInit {
  @Input() currentImageUrl?: string;
  @Output() confirm = new EventEmitter<BackgroundImageResult>();
  @Output() cancel = new EventEmitter<void>();

  selectedType: 'url' | 'savedMap' = 'url';
  imageUrl: string = '';
  selectedMapId: number | null = null;
  savedMaps: SavedMap[] = [];
  loadingMaps: boolean = false;
  previewUrl: string = '';
  previewError: boolean = false;
  previewSvgContent: SafeHtml | null = null;
  selectedMapPreview: string = '';
  selectedMapSvgContent: SafeHtml | null = null;

  constructor(
    private savedMapsService: SavedMapsService,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Initialize with current URL if available
    if (this.currentImageUrl) {
      this.imageUrl = this.currentImageUrl;
      this.previewUrl = this.currentImageUrl;
      this.loadPreviewSvg(this.currentImageUrl, (content) => this.previewSvgContent = content);
    }
    
    // Load saved maps
    this.loadSavedMaps();
  }

  loadSavedMaps(): void {
    this.loadingMaps = true;
    this.savedMapsService.getAllMaps().subscribe({
      next: (maps) => {
        this.savedMaps = maps;
        this.loadingMaps = false;
      },
      error: (err) => {
        console.error('Error loading saved maps:', err);
        this.loadingMaps = false;
      }
    });
  }

  onTypeChange(): void {
    this.previewUrl = '';
    this.previewError = false;
    this.previewSvgContent = null;
    this.selectedMapPreview = '';
    this.selectedMapSvgContent = null;
    this.selectedMapId = null;
  }
  
  onPreviewUrl(): void {
    this.previewUrl = this.imageUrl;
    this.previewError = false;
    this.loadPreviewSvg(this.previewUrl, (content) => this.previewSvgContent = content);
  }
  
  private loadPreviewSvg(url: string, callback: (content: SafeHtml | null) => void): void {
    // If it's not a battlemap-image URL (e.g., external image), use img tag
    if (!url || !url.includes('/battlemap-image')) {
      callback(null);
      return;
    }
    
    // Fetch the SVG content
    this.http.get(url, { responseType: 'text' }).subscribe({
      next: (svgContent) => {
        // Bypass security since we control the backend and need SVG <image> tags to work
        callback(this.sanitizer.bypassSecurityTrustHtml(svgContent));
      },
      error: (err) => {
        console.error('Error loading preview SVG:', err);
        callback(null);
      }
    });
  }

  onMapIdChange(value: any): void {
    // Convert string to number if needed (HTML select returns strings)
    this.selectedMapId = value === null || value === '' ? null : Number(value);
    this.onMapSelected();
  }

  onMapSelected(): void {
    if (this.selectedType === 'savedMap' && this.selectedMapId) {
      const selectedMap = this.savedMaps.find(m => m.id === this.selectedMapId);
      if (selectedMap) {
        // Generate battlemap image URL from saved map dataParam
        const previewUrl = `${environment.apiUrl}/battlemap-image?data=${encodeURIComponent(selectedMap.dataParam)}`;
        this.selectedMapPreview = previewUrl;
        this.loadPreviewSvg(previewUrl, (content) => this.selectedMapSvgContent = content);
      } else {
        this.selectedMapPreview = '';
        this.selectedMapSvgContent = null;
      }
    } else {
      this.selectedMapPreview = '';
      this.selectedMapSvgContent = null;
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    if (!this.isValid()) {
      console.warn('Cannot confirm: invalid state', { selectedType: this.selectedType, selectedMapId: this.selectedMapId, isValid: this.isValid() });
      return;
    }
    
    if (this.selectedType === 'url') {
      const url = this.imageUrl.trim() || undefined;
      this.confirm.emit({ imageUrl: url });
    } else if (this.selectedType === 'savedMap' && this.selectedMapId) {
      // Ensure selectedMapId is a number for comparison
      const mapId = typeof this.selectedMapId === 'string' ? Number(this.selectedMapId) : this.selectedMapId;
      const selectedMap = this.savedMaps.find(m => m.id === mapId);
      if (selectedMap) {
        // Generate battlemap image URL from saved map dataParam
        const imageUrl = `${environment.apiUrl}/battlemap-image?data=${encodeURIComponent(selectedMap.dataParam)}`;
        // Also pass the dataParam so we can extract environment objects
        this.confirm.emit({ imageUrl, dataParam: selectedMap.dataParam });
      } else {
        console.error('Selected map not found for id:', mapId);
      }
    }
  }

  isValid(): boolean {
    if (this.selectedType === 'url') {
      return true; // URL can be empty (to remove background)
    } else {
      return this.selectedMapId !== null;
    }
  }
}

