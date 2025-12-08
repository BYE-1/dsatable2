import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Character } from '../../models/character.model';
import { CharacterService } from '../../services/character.service';
import { environment } from '../../../environments/environment';
import { AvatarEditorComponent } from '../avatar-editor/avatar-editor.component';

@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarEditorComponent],
  templateUrl: './character-card.component.html',
  styleUrl: './character-card.component.scss'
})
export class CharacterCardComponent {
  @Input() character!: Character;
  @Input() showExpandButton: boolean = true;
  @Input() compact: boolean = false; // For compact display in lists/home
  @Output() characterClick = new EventEmitter<number>();
  @Output() characterUpdated = new EventEmitter<Character>();

  collapsedSections: { [key: string]: boolean } = {};
  
  // Avatar editing
  showAvatarDialog = false;

  constructor(private characterService: CharacterService) {}

  toggleSection(section: string): void {
    if (this.character.id === undefined) return;
    const key = `${this.character.id}_${section}`;
    this.collapsedSections[key] = !this.collapsedSections[key];
  }

  isCollapsed(section: string): boolean {
    if (this.character.id === undefined) return true;
    const key = `${this.character.id}_${section}`;
    return this.collapsedSections[key] !== false;
  }

  toggleCharacter(event?: Event): void {
    // Don't allow expansion in compact mode
    if (this.compact) return;
    
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.character.id === undefined) return;
    const key = `${this.character.id}_card`;
    const currentState = this.collapsedSections[key] !== false;
    this.collapsedSections[key] = !currentState;
  }

  isCharacterCollapsed(): boolean {
    // Always collapsed in compact mode
    if (this.compact) return true;
    
    if (this.character.id === undefined) return true;
    const key = `${this.character.id}_card`;
    return this.collapsedSections[key] !== false;
  }

  onCharacterClick(): void {
    if (this.character.id !== undefined) {
      this.characterClick.emit(this.character.id);
    }
  }

  getAvatarUrl(): string {
    if (this.character.avatarUrl && this.character.avatarUrl.trim() !== '') {
      if (this.character.avatarUrl.startsWith('/')) {
        return `${environment.apiUrl.replace('/api', '')}${this.character.avatarUrl}`;
      }
      return this.character.avatarUrl;
    }
    return `${environment.apiUrl.replace('/api', '')}/api/char`;
  }

  openAvatarDialog(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showAvatarDialog = true;
  }

  closeAvatarDialog(): void {
    this.showAvatarDialog = false;
  }

  onAvatarSaved(result: { avatarUrl: string; borderColor?: string }): void {
    if (!this.character.id) {
      this.closeAvatarDialog();
      return;
    }

    // Update character
    const updatedCharacter = { ...this.character, avatarUrl: result.avatarUrl };
    this.characterService.updateCharacter(this.character.id, updatedCharacter).subscribe({
      next: (character: Character) => {
        // Update the character object in place to maintain reference
        Object.assign(this.character, character);
        this.characterUpdated.emit(this.character);
        this.closeAvatarDialog();
      },
      error: (err: any) => {
        console.error('Error updating avatar:', err);
      }
    });
  }
}
