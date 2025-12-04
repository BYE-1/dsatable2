import { Character } from './character.model';
import { User } from './auth.model';

export interface GameSession {
  id?: number;
  title: string;
  description?: string;
  gameMaster?: User;
  players?: User[];
  characters?: Character[];
  createdAt?: string;
}
