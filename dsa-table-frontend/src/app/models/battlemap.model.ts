export interface BattlemapToken {
  id?: number;
  tid?: number; // JSON property name from backend (@JsonProperty("tid"))
  tokenId?: number; // Mapped from tid for internal use
  x: number;
  y: number;
  gm?: boolean; // JSON property name from backend (@JsonProperty("gm"))
  isGmOnly?: boolean; // Mapped from gm for internal use
  color?: string;
  url?: string; // JSON property name from backend (@JsonProperty("url"))
  avatarUrl?: string; // Mapped from url for internal use
  bc?: string; // JSON property name from backend (@JsonProperty("bc"))
  borderColor?: string; // Mapped from bc for internal use
  name?: string;
  // Environment object properties
  et?: string; // envType
  ec?: string; // envColor
  es?: number; // envSize
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
