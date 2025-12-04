import { User } from './auth.model';

export interface ChatMessage {
  id?: number;
  sessionId: number;
  author: User;
  message: string;
  createdAt: string;
}

export interface ChatMessageRequest {
  message: string;
}

