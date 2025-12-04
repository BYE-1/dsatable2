import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CharacterService } from '../../services/character.service';
import { AuthService } from '../../services/auth.service';
import { Character } from '../../models/character.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-character-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './character-list.component.html',
  styleUrl: './character-list.component.scss'
})
export class CharacterListComponent implements OnInit {
  characters: Character[] = [];
  loading = false;
  uploading = false;
  error: string | null = null;
  uploadError: string | null = null;
  selectedFile: File | null = null;
  isDragging = false;
  collapsedSections: { [key: string]: boolean } = {};
  
  // Avatar editing
  showAvatarDialog = false;
  editingCharacter: Character | null = null;
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
  
  // Available options
  hairOptions = ['', 'long', 'short_ruffled', 'short_curly', 'undercut', 'tomahawk', 'bald'];
  mouthOptions = ['up', 'down', 'straight', 'covered'];
  earsOptions = ['none', 'normal', 'pointy'];
  eyebrowsOptions = ['none', 'straight', 'down'];
  weaponOptions = ['none', 'sword', 'axe', 'bow'];
  equipOptions = ['shoulder_pads', 'helmet'];

  constructor(
    private characterService: CharacterService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCharacters();
  }

  toggleSection(characterId: number | undefined, section: string): void {
    if (characterId === undefined) return;
    const key = `${characterId}_${section}`;
    this.collapsedSections[key] = !this.collapsedSections[key];
  }

  isCollapsed(characterId: number | undefined, section: string): boolean {
    if (characterId === undefined) return true;
    const key = `${characterId}_${section}`;
    // Default to collapsed (true) if not set
    return this.collapsedSections[key] !== false;
  }

  toggleCharacter(characterId: number | undefined, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (characterId === undefined) return;
    const key = `${characterId}_card`;
    // If not set, default to true (collapsed), so toggle to false (expanded)
    // If set to true (collapsed), toggle to false (expanded)
    // If set to false (expanded), toggle to true (collapsed)
    const currentState = this.collapsedSections[key] !== false; // true if collapsed or undefined
    this.collapsedSections[key] = !currentState;
  }

  isCharacterCollapsed(characterId: number | undefined): boolean {
    if (characterId === undefined) return true;
    const key = `${characterId}_card`;
    // Default to collapsed (true) if not set
    return this.collapsedSections[key] !== false;
  }

  loadCharacters(): void {
    this.loading = true;
    this.error = null;

    const currentUser = this.authService.getCurrentUser();
    const ownerId = currentUser?.id;

    this.characterService.getAllCharacters(ownerId).subscribe({
      next: (data: Character[]) => {
        this.characters = data;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load characters. Make sure the backend is running on http://localhost:8080';
        this.loading = false;
        console.error('Error loading characters:', err);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    if (file.type === 'text/xml' || file.type === 'application/xml' || file.name.endsWith('.xml')) {
      this.selectedFile = file;
      this.uploadError = null;
    } else {
      this.uploadError = 'Please select a valid XML file';
      this.selectedFile = null;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  uploadCharacter(): void {
    if (!this.selectedFile) {
      this.uploadError = 'Please select a file first';
      return;
    }

    this.uploading = true;
    this.uploadError = null;

    this.characterService.uploadCharacterFromXml(this.selectedFile).subscribe({
      next: (character: Character) => {
        this.uploading = false;
        this.selectedFile = null;
        // Reset file input
        const fileInput = document.getElementById('xml-file-input') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        // Reload characters to show the new one
        this.loadCharacters();
      },
      error: (err: any) => {
        this.uploading = false;
        this.uploadError = err.error?.error || 'Failed to upload character. Please check the XML file format.';
        console.error('Error uploading character:', err);
      }
    });
  }

  clearFileSelection(): void {
    this.selectedFile = null;
    this.uploadError = null;
    const fileInput = document.getElementById('xml-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

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

  openAvatarDialog(character: Character): void {
    this.editingCharacter = character;
    // Parse existing avatar URL if it has parameters
    if (character.avatarUrl && character.avatarUrl.includes('?')) {
      const url = new URL(character.avatarUrl, window.location.origin);
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
    this.editingCharacter = null;
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
    if (!this.editingCharacter || !this.editingCharacter.id) return;

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
    const updatedCharacter = { ...this.editingCharacter, avatarUrl };
    this.characterService.updateCharacter(this.editingCharacter.id, updatedCharacter).subscribe({
      next: (character: Character) => {
        const index = this.characters.findIndex(c => c.id === character.id);
        if (index > -1) {
          this.characters[index] = character;
        }
        this.closeAvatarDialog();
      },
      error: (err: any) => {
        console.error('Error updating avatar:', err);
        this.error = 'Failed to update avatar';
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
