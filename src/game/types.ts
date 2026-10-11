export type Player = 'P1' | 'P2';

export interface Position {
  row: number;
  col: number;
}

export type WallOrientation = 'horizontal' | 'vertical';

export interface Wall {
  row: number;
  col: number;
  orientation: WallOrientation;
}

export type Action =
  | { type: 'move'; to: Position }
  | { type: 'placeWall'; wall: Wall };

export interface GameState {
  p1Pos: Position;
  p2Pos: Position;
  p1WallsRemaining: number;
  p2WallsRemaining: number;
  walls: Wall[];
  activePlayer: Player;
  winner: Player | null;
  moveCount: number;
}

export interface ActionResult {
  success: boolean;
  state: GameState;
  error?: string;
}
