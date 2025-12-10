export interface EnvironmentObject {
  id: number;
  type: 'tree' | 'stone' | 'house';
  x: number;
  y: number;
  color?: string;
  size?: number;
}

