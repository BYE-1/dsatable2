import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CharacterService } from '../../services/character.service';
import { GameSessionService } from '../../services/game-session.service';
import { AuthService } from '../../services/auth.service';
import { Character } from '../../models/character.model';
import { GameSession } from '../../models/game-session.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  characters: Character[] = [];
  sessions: GameSession[] = [];
  charactersLoading = false;
  sessionsLoading = false;
  charactersError: string | null = null;
  sessionsError: string | null = null;

  constructor(
    private characterService: CharacterService,
    private gameSessionService: GameSessionService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCharacters();
    this.loadSessions();
  }

  loadCharacters(): void {
    this.charactersLoading = true;
    this.charactersError = null;

    const currentUser = this.authService.getCurrentUser();
    const ownerId = currentUser?.id;

    this.characterService.getAllCharacters(ownerId).subscribe({
      next: (data: Character[]) => {
        this.characters = data.slice(0, 5); // Show only first 5
        this.charactersLoading = false;
      },
      error: (err: any) => {
        this.charactersError = 'Failed to load characters.';
        this.charactersLoading = false;
        console.error('Error loading characters:', err);
      }
    });
  }

  loadSessions(): void {
    this.sessionsLoading = true;
    this.sessionsError = null;

    this.gameSessionService.getAllSessions().subscribe({
      next: (data: GameSession[]) => {
        this.sessions = data.slice(0, 5); // Show only first 5
        this.sessionsLoading = false;
      },
      error: (err: any) => {
        this.sessionsError = 'Failed to load game sessions.';
        this.sessionsLoading = false;
        console.error('Error loading game sessions:', err);
      }
    });
  }

  navigateToCharacters(): void {
    this.router.navigate(['/characters']);
  }

  navigateToSessions(): void {
    this.router.navigate(['/sessions']);
  }

  navigateToCharacter(id: number): void {
    // Navigate to characters page - could be enhanced to show specific character
    this.router.navigate(['/characters']);
  }

  navigateToSession(id: number): void {
    this.router.navigate(['/sessions', id]);
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
}

