import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { ChatMessage, ChatMessageRequest } from '../models/chat-message.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.apiUrl}/sessions`;

  constructor(private http: HttpClient) {}

  getMessages(sessionId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/${sessionId}/chat`);
  }

  sendMessage(sessionId: number, message: string): Observable<ChatMessage> {
    const request: ChatMessageRequest = { message };
    return this.http.post<ChatMessage>(`${this.apiUrl}/${sessionId}/chat`, request);
  }

  // Poll for new messages every 3 seconds
  pollMessages(sessionId: number, intervalMs: number = 3000): Observable<ChatMessage[]> {
    return interval(intervalMs).pipe(
      startWith(0),
      switchMap(() => this.getMessages(sessionId))
    );
  }
}

