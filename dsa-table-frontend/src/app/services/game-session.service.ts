import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { GameSession } from '../models/game-session.model';
import { Character } from '../models/character.model';
import { Battlemap } from '../models/battlemap.model';
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

  getBattlemap(sessionId: number): Observable<Battlemap | null> {
    return this.http.get<Battlemap>(`${this.apiUrl}/${sessionId}/battlemap`).pipe(
      catchError(() => of(null))
    );
  }

  updateBattlemap(sessionId: number, battlemap: Battlemap): Observable<Battlemap> {
    return this.http.put<Battlemap>(`${this.apiUrl}/${sessionId}/battlemap`, battlemap);
  }

  // Poll for battlemap updates every 2 seconds
  pollBattlemap(sessionId: number, intervalMs: number = 2000): Observable<Battlemap | null> {
    return interval(intervalMs).pipe(
      startWith(0),
      switchMap(() => this.getBattlemap(sessionId))
    );
  }
}


