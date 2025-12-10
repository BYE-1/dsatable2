import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CharacterService } from '../../services/character.service';
import { AuthService } from '../../services/auth.service';
import { Character } from '../../models/character.model';
import { CharacterCardComponent } from '../character-card/character-card.component';

@Component({
  selector: 'app-character-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, CharacterCardComponent],
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

  constructor(
    private characterService: CharacterService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCharacters();
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

  onCharacterUpdated(updatedCharacter: Character): void {
    // The character object is updated in place, so no action needed
    // This method exists to handle the event if needed in the future
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

}
