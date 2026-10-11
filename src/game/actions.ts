import { Action, ActionResult, GameState, Wall } from './types';
import { cloneState, checkWinner, getOpponent } from './state';
import { getLegalPawnMoves, isLegalPawnMove } from './movement';
import { canPlaceWallGeometrically, MAX_WALL_ANCHOR } from './walls';
import { hasPathToGoal } from './pathfinding';

/**
 * Validates whether a wall placement is completely legal under all game rules:
 * - Active player has walls remaining
 * - Anchor coordinates within 0..7
 * - No overlap or perpendicular crossing
 * - Both players retain at least one open path to their respective goal rows
 */
export function isWallPlacementLegal(
  state: GameState,
  wall: Wall
): { valid: boolean; reason?: string } {
  if (state.winner !== null) {
    return { valid: false, reason: 'Game has already concluded.' };
  }

  const remaining =
    state.activePlayer === 'P1'
      ? state.p1WallsRemaining
      : state.p2WallsRemaining;

  if (remaining <= 0) {
    return { valid: false, reason: 'No walls remaining for the active player.' };
  }

  const geomCheck = canPlaceWallGeometrically(state.walls, wall);
  if (!geomCheck.valid) {
    return geomCheck;
  }

  // Path preservation test: both players must have a path to their goal row
  const tentativeWalls = [...state.walls, wall];
  const p1CanReach = hasPathToGoal(tentativeWalls, state.p1Pos, 'P1');
  if (!p1CanReach) {
    return {
      valid: false,
      reason: 'That wall blocks every route to the goal for Player 1.',
    };
  }

  const p2CanReach = hasPathToGoal(tentativeWalls, state.p2Pos, 'P2');
  if (!p2CanReach) {
    return {
      valid: false,
      reason: 'That wall blocks every route to the goal for Player 2.',
    };
  }

  return { valid: true };
}

/**
 * Validates an action against the full game rules without mutating state.
 */
export function validateAction(
  state: GameState,
  action: Action
): { valid: boolean; reason?: string } {
  if (state.winner !== null) {
    return { valid: false, reason: 'Game has already concluded.' };
  }

  if (action.type === 'move') {
    if (!isLegalPawnMove(state, state.activePlayer, action.to)) {
      return {
        valid: false,
        reason: `Illegal pawn move to (${action.to.row}, ${action.to.col}).`,
      };
    }
    return { valid: true };
  }

  if (action.type === 'placeWall') {
    return isWallPlacementLegal(state, action.wall);
  }

  return { valid: false, reason: 'Unknown action type.' };
}

/**
 * Applies a validated action to the state immutably.
 * If the action is invalid, returns success: false with the original state untouched.
 */
export function applyAction(state: GameState, action: Action): ActionResult {
  const check = validateAction(state, action);
  if (!check.valid) {
    return {
      success: false,
      state,
      error: check.reason ?? 'Invalid action.',
    };
  }

  const nextState = cloneState(state);

  if (action.type === 'move') {
    if (nextState.activePlayer === 'P1') {
      nextState.p1Pos = { ...action.to };
    } else {
      nextState.p2Pos = { ...action.to };
    }
  } else if (action.type === 'placeWall') {
    nextState.walls.push({ ...action.wall });
    if (nextState.activePlayer === 'P1') {
      nextState.p1WallsRemaining -= 1;
    } else {
      nextState.p2WallsRemaining -= 1;
    }
  }

  nextState.moveCount += 1;

  // Check for immediate win
  const winner = checkWinner(nextState);
  if (winner !== null) {
    nextState.winner = winner;
  } else {
    nextState.activePlayer = getOpponent(nextState.activePlayer);
  }

  return {
    success: true,
    state: nextState,
  };
}

/**
 * Returns all exhaustive legal actions available to the active player.
 */
export function getAllLegalActions(state: GameState): Action[] {
  if (state.winner !== null) return [];

  const actions: Action[] = [];

  // Legal pawn moves
  const pawnMoves = getLegalPawnMoves(state, state.activePlayer);
  for (const move of pawnMoves) {
    actions.push({ type: 'move', to: move });
  }

  // Legal wall placements
  const remainingWalls =
    state.activePlayer === 'P1'
      ? state.p1WallsRemaining
      : state.p2WallsRemaining;

  if (remainingWalls > 0) {
    for (let r = 0; r <= MAX_WALL_ANCHOR; r++) {
      for (let c = 0; c <= MAX_WALL_ANCHOR; c++) {
        for (const orientation of ['horizontal', 'vertical'] as const) {
          const wall: Wall = { row: r, col: c, orientation };
          const check = isWallPlacementLegal(state, wall);
          if (check.valid) {
            actions.push({ type: 'placeWall', wall });
          }
        }
      }
    }
  }

  return actions;
}
