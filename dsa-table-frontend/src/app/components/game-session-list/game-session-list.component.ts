import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { GameSessionService } from '../../services/game-session.service';
import { AuthService } from '../../services/auth.service';
import { GameSession } from '../../models/game-session.model';

@Component({
  selector: 'app-game-session-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './game-session-list.component.html',
  styleUrl: './game-session-list.component.scss'
})
export class GameSessionListComponent implements OnInit {
  sessions: GameSession[] = [];
  loading = false;
  error: string | null = null;
  filterMode: 'all' | 'gm' | 'player' = 'all';
  currentUserId: number | null = null;

  constructor(
    private gameSessionService: GameSessionService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.currentUserId = currentUser.id;
    }
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading = true;
    this.error = null;

    let request: any;
    if (this.filterMode === 'gm' && this.currentUserId) {
      request = this.gameSessionService.getAllSessions(this.currentUserId);
    } else if (this.filterMode === 'player' && this.currentUserId) {
      request = this.gameSessionService.getAllSessions(undefined, this.currentUserId);
    } else {
      request = this.gameSessionService.getAllSessions();
    }

    request.subscribe({
      next: (data: GameSession[]) => {
        this.sessions = data;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load game sessions.';
        this.loading = false;
        console.error('Error loading game sessions:', err);
      }
    });
  }

  onFilterChange(mode: 'all' | 'gm' | 'player'): void {
    this.filterMode = mode;
    this.loadSessions();
  }

  deleteSession(id: number, event: Event): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this game session?')) {
      this.gameSessionService.deleteSession(id).subscribe({
        next: () => {
          this.loadSessions();
        },
        error: (err: any) => {
          alert('Failed to delete game session.');
          console.error('Error deleting game session:', err);
        }
      });
    }
  }

  isGameMaster(session: GameSession): boolean {
    return session.gameMaster?.id === this.currentUserId;
  }

  navigateToSession(id: number): void {
    this.router.navigate(['/sessions', id]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/sessions/new']);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}

