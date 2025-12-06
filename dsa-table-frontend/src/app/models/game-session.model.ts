import { Character } from './character.model';
import { User } from './auth.model';
import { Battlemap } from './battlemap.model';

export interface GameSession {
  id?: number;
  title: string;
  description?: string;
  gameMaster?: User;
  players?: User[];
  characters?: Character[];
  createdAt?: string;
  battlemap?: Battlemap;
}
