import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GameSessionService } from '../../services/game-session.service';
import { AuthService } from '../../services/auth.service';
import { GameSession } from '../../models/game-session.model';

@Component({
  selector: 'app-game-session-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './game-session-form.component.html',
  styleUrl: './game-session-form.component.scss'
})
export class GameSessionFormComponent implements OnInit {
  sessionForm: FormGroup;
  isEditMode = false;
  sessionId: number | null = null;
  loading = false;
  error: string | null = null;
  currentUserId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private gameSessionService: GameSessionService,
    private authService: AuthService
  ) {
    this.sessionForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(128)]],
      description: ['', [Validators.maxLength(1024)]]
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.currentUserId = currentUser.id;
    }

    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id === 'new') {
        this.isEditMode = false;
      } else {
        this.isEditMode = true;
        this.sessionId = +id;
        this.loadSession();
      }
    });
  }

  loadSession(): void {
    if (!this.sessionId) return;

    this.loading = true;
    this.gameSessionService.getSessionById(this.sessionId).subscribe({
      next: (session: GameSession) => {
        this.sessionForm.patchValue({
          title: session.title,
          description: session.description || ''
        });
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load game session.';
        this.loading = false;
        console.error('Error loading game session:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.sessionForm.valid) {
      this.loading = true;
      this.error = null;

      const sessionData: GameSession = {
        ...this.sessionForm.value,
        gameMaster: this.currentUserId ? { id: this.currentUserId } : undefined
      };

      const request = this.isEditMode && this.sessionId
        ? this.gameSessionService.updateSession(this.sessionId, sessionData)
        : this.gameSessionService.createSession(sessionData);

      request.subscribe({
        next: (session: GameSession) => {
          this.router.navigate(['/sessions', session.id]);
        },
        error: (err: any) => {
          this.error = err.error?.error || 'Failed to save game session.';
          this.loading = false;
          console.error('Error saving game session:', err);
        }
      });
    }
  }

  cancel(): void {
    if (this.sessionId) {
      this.router.navigate(['/sessions', this.sessionId]);
    } else {
      this.router.navigate(['/sessions']);
    }
  }
}

