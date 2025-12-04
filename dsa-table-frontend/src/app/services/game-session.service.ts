import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { GameSession } from '../models/game-session.model';
import { Character } from '../models/character.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GameSessionService {
  private apiUrl = `${environment.apiUrl}/sessions`;

  constructor(private http: HttpClient) {}

  getAllSessions(gmId?: number, playerId?: number): Observable<GameSession[]> {
    let params = new HttpParams();
    if (gmId) params = params.set('gmId', gmId.toString());
    if (playerId) params = params.set('playerId', playerId.toString());
    
    return this.http.get<GameSession[]>(this.apiUrl, { params });
  }

  getSessionById(id: number): Observable<GameSession> {
    return this.http.get<GameSession>(`${this.apiUrl}/${id}`);
  }

  createSession(session: GameSession): Observable<GameSession> {
    return this.http.post<GameSession>(this.apiUrl, session);
  }

  updateSession(id: number, session: GameSession): Observable<GameSession> {
    return this.http.put<GameSession>(`${this.apiUrl}/${id}`, session);
  }

  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  joinSession(sessionId: number, characterId: number): Observable<GameSession> {
    return this.http.post<GameSession>(`${this.apiUrl}/${sessionId}/join?characterId=${characterId}`, {});
  }

  getMyCharacter(sessionId: number): Observable<Character | null> {
    return this.http.get<Character>(`${this.apiUrl}/${sessionId}/my-character`).pipe(
      catchError(() => of(null))
    );
  }
}


