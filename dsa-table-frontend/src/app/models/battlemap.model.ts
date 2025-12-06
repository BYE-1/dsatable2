export interface BattlemapToken {
  id?: number;
  tokenId: number;
  x: number;
  y: number;
  isGmOnly: boolean;
}

export interface Battlemap {
  id?: number;
  sessionId?: number;
  gridSize?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  mapImageUrl?: string;
  tokens?: BattlemapToken[];
}
