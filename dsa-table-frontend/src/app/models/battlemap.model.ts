export interface BattlemapToken {
  id?: number;
  tokenId: number;
  x: number;
  y: number;
  isGmOnly: boolean;
  color?: string;
  avatarUrl?: string;
  borderColor?: string;
  name?: string;
}

export interface FogRevealedArea {
  gridX: number;
  gridY: number;
}

export interface Battlemap {
  id?: number;
  sessionId?: number;
  gridSize?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  mapImageUrl?: string;
  tokens?: BattlemapToken[];
  fogRevealedAreas?: FogRevealedArea[];
}
