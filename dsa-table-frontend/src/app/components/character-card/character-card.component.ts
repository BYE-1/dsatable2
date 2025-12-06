import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Character } from '../../models/character.model';
import { CharacterService } from '../../services/character.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  avatarOptions = {
    hair: '',
    skin: '#ffd9b5',
    clothC: '#00cc00',
    hairColour: '#f3bf00',
    mouth: 'up',
    ears: 'none',
    eyebrows: 'none',
    weapon: 'none',
    equip: [] as string[]
  };

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
    // Parse existing avatar URL if it has parameters
    if (this.character.avatarUrl && this.character.avatarUrl.includes('?')) {
      const url = new URL(this.character.avatarUrl, window.location.origin);
      this.avatarOptions.hair = url.searchParams.get('hair') || '';
      this.avatarOptions.skin = url.searchParams.get('skin') || '#ffd9b5';
      this.avatarOptions.clothC = url.searchParams.get('clothC') || '#00cc00';
      this.avatarOptions.hairColour = url.searchParams.get('hairColour') || '#f3bf00';
      this.avatarOptions.mouth = url.searchParams.get('mouth') || 'up';
      this.avatarOptions.ears = url.searchParams.get('ears') || 'none';
      this.avatarOptions.eyebrows = url.searchParams.get('eyebrows') || 'none';
      this.avatarOptions.weapon = url.searchParams.get('weapon') || 'none';
      const equipParam = url.searchParams.get('equip');
      this.avatarOptions.equip = equipParam ? equipParam.split(',') : [];
    } else {
      // Reset to defaults
      this.avatarOptions = {
        hair: '',
        skin: '#ffd9b5',
        clothC: '#00cc00',
        hairColour: '#f3bf00',
        mouth: 'up',
        ears: 'none',
        eyebrows: 'none',
        weapon: 'none',
        equip: []
      };
    }
    this.showAvatarDialog = true;
  }

  closeAvatarDialog(): void {
    this.showAvatarDialog = false;
  }

  toggleEquip(equip: string): void {
    const index = this.avatarOptions.equip.indexOf(equip);
    if (index > -1) {
      this.avatarOptions.equip.splice(index, 1);
    } else {
      this.avatarOptions.equip.push(equip);
    }
  }

  isEquipSelected(equip: string): boolean {
    return this.avatarOptions.equip.includes(equip);
  }

  saveAvatar(): void {
    if (!this.character.id) return;

    // Build the avatar URL with parameters
    const params = new URLSearchParams();
    if (this.avatarOptions.hair) params.set('hair', this.avatarOptions.hair);
    if (this.avatarOptions.skin !== '#ffd9b5') params.set('skin', this.avatarOptions.skin);
    if (this.avatarOptions.clothC !== '#00cc00') params.set('clothC', this.avatarOptions.clothC);
    if (this.avatarOptions.hairColour !== '#f3bf00') params.set('hairColour', this.avatarOptions.hairColour);
    if (this.avatarOptions.mouth !== 'up') params.set('mouth', this.avatarOptions.mouth);
    if (this.avatarOptions.ears !== 'none') params.set('ears', this.avatarOptions.ears);
    if (this.avatarOptions.eyebrows !== 'none') params.set('eyebrows', this.avatarOptions.eyebrows);
    if (this.avatarOptions.weapon !== 'none') params.set('weapon', this.avatarOptions.weapon);
    if (this.avatarOptions.equip.length > 0) {
      params.set('equip', this.avatarOptions.equip.join(','));
    }

    const queryString = params.toString();
    const avatarUrl = queryString ? `/api/char?${queryString}` : '/api/char';

    // Update character
    const updatedCharacter = { ...this.character, avatarUrl };
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

  getPreviewUrl(): string {
    const params = new URLSearchParams();
    if (this.avatarOptions.hair) params.set('hair', this.avatarOptions.hair);
    if (this.avatarOptions.skin) params.set('skin', this.avatarOptions.skin);
    if (this.avatarOptions.clothC) params.set('clothC', this.avatarOptions.clothC);
    if (this.avatarOptions.hairColour) params.set('hairColour', this.avatarOptions.hairColour);
    if (this.avatarOptions.mouth) params.set('mouth', this.avatarOptions.mouth);
    if (this.avatarOptions.ears) params.set('ears', this.avatarOptions.ears);
    if (this.avatarOptions.eyebrows) params.set('eyebrows', this.avatarOptions.eyebrows);
    if (this.avatarOptions.weapon) params.set('weapon', this.avatarOptions.weapon);
    if (this.avatarOptions.equip.length > 0) {
      params.set('equip', this.avatarOptions.equip.join(','));
    }
    const queryString = params.toString();
    return `${environment.apiUrl.replace('/api', '')}/api/char${queryString ? '?' + queryString : ''}`;
  }
}
