import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvatarEditorComponent } from '../avatar-editor/avatar-editor.component';

export interface TokenAppearanceConfig {
  color?: string;
  avatarUrl?: string;
  borderColor?: string;
  name?: string;
}

@Component({
  selector: 'app-token-appearance-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarEditorComponent],
  templateUrl: './token-appearance-dialog.component.html',
  styleUrl: './token-appearance-dialog.component.scss'
})
export class TokenAppearanceDialogComponent {
  @Input() token: { id: number; x: number; y: number; isGmOnly: boolean; avatarUrl?: string; characterId?: number; color?: string; borderColor?: string; name?: string } | null = null;
  @Input() visible: boolean = false;
  @Input() isPlayerMode: boolean = false;
  
  @Output() saved = new EventEmitter<TokenAppearanceConfig>();
  @Output() canceled = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  tokenAppearanceMode: 'color' | 'avatar' = 'color';
  tokenColor: string = '#000000';
  tokenBorderColor: string = '#ffffff';
  tokenName: string = '';

  ngOnChanges(): void {
    if (this.token && this.visible) {
      this.loadTokenData();
    }
  }

  private loadTokenData(): void {
    if (!this.token) return;

    this.tokenName = this.token.name || '';
    this.tokenBorderColor = this.token.borderColor || '#ffffff';
    
    if (this.token.color) {
      this.tokenAppearanceMode = 'color';
      this.tokenColor = this.token.color;
    } else if (this.token.avatarUrl) {
      this.tokenAppearanceMode = 'avatar';
    } else {
      this.tokenAppearanceMode = 'color';
      this.tokenColor = '#000000';
    }
  }

  onAvatarSaved(result: { avatarUrl: string; borderColor?: string }): void {
    const config: TokenAppearanceConfig = {
      avatarUrl: result.avatarUrl,
      borderColor: result.borderColor || this.tokenBorderColor,
      color: undefined,
      name: this.tokenName || undefined
    };
    this.saved.emit(config);
  }

  onSaveClick(): void {
    if (this.isPlayerMode) {
      const config: TokenAppearanceConfig = {
        borderColor: this.tokenBorderColor
      };
      this.saved.emit(config);
    } else if (this.tokenAppearanceMode === 'color') {
      const config: TokenAppearanceConfig = {
        color: this.tokenColor,
        borderColor: this.tokenBorderColor,
        avatarUrl: undefined,
        name: this.tokenName || undefined
      };
      this.saved.emit(config);
    }
  }

  onCancelClick(): void {
    this.canceled.emit();
  }

  onDeleteClick(): void {
    if (confirm('Are you sure you want to delete this token?')) {
      this.deleted.emit();
    }
  }

  get canDelete(): boolean {
    return !this.isPlayerMode && this.token !== null && !this.token.characterId;
  }

  onDialogOverlayClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('token-appearance-dialog-overlay')) {
      this.onCancelClick();
    }
  }
}
