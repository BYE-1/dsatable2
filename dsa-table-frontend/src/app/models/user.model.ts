import { Character } from './character.model';

export interface User {
  id?: number;
  username: string;
  displayName: string;
  characters?: Character[];
}
