import { GameState, Player, Position } from './types';

export const INITIAL_WALLS_PER_PLAYER = 10;

export const INITIAL_P1_POS: Position = { row: 8, col: 4 };
export const INITIAL_P2_POS: Position = { row: 0, col: 4 };

/**
 * Creates a fresh standard 2-player Quoridor initial state.
 */
export function createInitialState(): GameState {
  return {
    p1Pos: { ...INITIAL_P1_POS },
    p2Pos: { ...INITIAL_P2_POS },
    p1WallsRemaining: INITIAL_WALLS_PER_PLAYER,
    p2WallsRemaining: INITIAL_WALLS_PER_PLAYER,
    walls: [],
    activePlayer: 'P1',
    winner: null,
    moveCount: 0,
  };
}

/**
 * Creates an immutable deep copy of the game state.
 */
export function cloneState(state: GameState): GameState {
  return {
    p1Pos: { ...state.p1Pos },
    p2Pos: { ...state.p2Pos },
    p1WallsRemaining: state.p1WallsRemaining,
    p2WallsRemaining: state.p2WallsRemaining,
    walls: state.walls.map((w) => ({ ...w })),
    activePlayer: state.activePlayer,
    winner: state.winner,
    moveCount: state.moveCount,
  };
}

/**
 * Checks if a player has reached their goal row.
 */
export function checkWinner(state: GameState): Player | null {
  if (state.p1Pos.row === 0) return 'P1';
  if (state.p2Pos.row === 8) return 'P2';
  return null;
}

/**
 * Switches the active player ('P1' <-> 'P2').
 */
export function getOpponent(player: Player): Player {
  return player === 'P1' ? 'P2' : 'P1';
}
