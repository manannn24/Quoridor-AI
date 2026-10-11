import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { getLegalPawnMoves, isLegalPawnMove } from '../src/game/movement';
import {
  canPlaceWallGeometrically,
} from '../src/game/walls';
import {
  applyAction,
  isWallPlacementLegal,
} from '../src/game/actions';
import { Wall } from '../src/game/types';

describe('Quoridor Engine - Initial State', () => {
  it('correctly initializes the standard 2-player game state', () => {
    const state = createInitialState();
    expect(state.p1Pos).toEqual({ row: 8, col: 4 });
    expect(state.p2Pos).toEqual({ row: 0, col: 4 });
    expect(state.p1WallsRemaining).toBe(10);
    expect(state.p2WallsRemaining).toBe(10);
    expect(state.walls).toEqual([]);
    expect(state.activePlayer).toBe('P1');
    expect(state.winner).toBeNull();
    expect(state.moveCount).toBe(0);
  });
});

describe('Quoridor Engine - Normal Pawn Movement', () => {
  it('generates 3 legal orthogonal moves from initial P1 position', () => {
    const state = createInitialState();
    const legalMoves = getLegalPawnMoves(state, 'P1');
    // From (8, 4), can go Up (7, 4), Left (8, 3), Right (8, 5). Down is off-board.
    expect(legalMoves).toHaveLength(3);
    expect(legalMoves).toEqual(
      expect.arrayContaining([
        { row: 7, col: 4 },
        { row: 8, col: 3 },
        { row: 8, col: 5 },
      ])
    );
  });

  it('rejects moves outside board bounds', () => {
    const state = createInitialState();
    expect(isLegalPawnMove(state, 'P1', { row: 9, col: 4 })).toBe(false);
    expect(isLegalPawnMove(state, 'P1', { row: 8, col: -1 })).toBe(false);
  });

  it('blocks pawn movement across horizontal and vertical walls', () => {
    const state = createInitialState();
    // Add horizontal wall at (7, 4) which blocks (7, 4)-(8, 4) and (7, 5)-(8, 5)
    state.walls.push({ row: 7, col: 4, orientation: 'horizontal' });

    const p1Moves = getLegalPawnMoves(state, 'P1');
    // Moving up to (7, 4) should now be blocked!
    expect(p1Moves).not.toContainEqual({ row: 7, col: 4 });
    expect(p1Moves).toContainEqual({ row: 8, col: 3 });
    expect(p1Moves).toContainEqual({ row: 8, col: 5 });
  });
});

describe('Quoridor Engine - Jump Rules', () => {
  it('allows straight jump over adjacent opponent when path is clear', () => {
    const state = createInitialState();
    // Position pawns face to face in middle: P1 at (5, 4), P2 at (4, 4)
    state.p1Pos = { row: 5, col: 4 };
    state.p2Pos = { row: 4, col: 4 };
    state.activePlayer = 'P1';

    const moves = getLegalPawnMoves(state, 'P1');
    // Straight jump over P2 lands on (3, 4)
    expect(moves).toContainEqual({ row: 3, col: 4 });
    // Diagonal jumps must NOT be present when straight jump is possible
    expect(moves).not.toContainEqual({ row: 4, col: 3 });
    expect(moves).not.toContainEqual({ row: 4, col: 5 });
  });

  it('allows diagonal jumps when straight jump is blocked by a wall behind opponent', () => {
    const state = createInitialState();
    state.p1Pos = { row: 5, col: 4 };
    state.p2Pos = { row: 4, col: 4 };
    state.activePlayer = 'P1';
    // Wall behind P2: horizontal wall at (3, 4) blocks (3, 4)-(4, 4)
    state.walls.push({ row: 3, col: 4, orientation: 'horizontal' });

    const moves = getLegalPawnMoves(state, 'P1');
    // Straight jump (3, 4) is blocked
    expect(moves).not.toContainEqual({ row: 3, col: 4 });
    // Diagonal jumps to (4, 3) and (4, 5) must be permitted
    expect(moves).toContainEqual({ row: 4, col: 3 });
    expect(moves).toContainEqual({ row: 4, col: 5 });
  });

  it('allows diagonal jump when straight jump is blocked by board edge', () => {
    const state = createInitialState();
    // P2 is at top edge (0, 4), P1 is at (1, 4)
    state.p1Pos = { row: 1, col: 4 };
    state.p2Pos = { row: 0, col: 4 };
    state.activePlayer = 'P1';

    const moves = getLegalPawnMoves(state, 'P1');
    // Straight jump would be row -1 (off board). Diagonal jumps to (0, 3) and (0, 5) must be allowed
    expect(moves).toContainEqual({ row: 0, col: 3 });
    expect(moves).toContainEqual({ row: 0, col: 5 });
  });

  it('blocks diagonal jump if the diagonal edge is blocked by a wall', () => {
    const state = createInitialState();
    state.p1Pos = { row: 5, col: 4 };
    state.p2Pos = { row: 4, col: 4 };
    state.activePlayer = 'P1';
    // Wall behind P2
    state.walls.push({ row: 3, col: 4, orientation: 'horizontal' });
    // Vertical wall at (4, 3) blocks (4, 3)-(4, 4)
    state.walls.push({ row: 4, col: 3, orientation: 'vertical' });

    const moves = getLegalPawnMoves(state, 'P1');
    // Diagonal to left (4, 3) is blocked, but right (4, 5) is open
    expect(moves).not.toContainEqual({ row: 4, col: 3 });
    expect(moves).toContainEqual({ row: 4, col: 5 });
  });
});

describe('Quoridor Engine - Wall Geometry & Legality', () => {
  it('rejects out-of-range wall anchors', () => {
    const state = createInitialState();
    expect(canPlaceWallGeometrically(state.walls, { row: -1, col: 0, orientation: 'horizontal' }).valid).toBe(false);
    expect(canPlaceWallGeometrically(state.walls, { row: 0, col: 8, orientation: 'horizontal' }).valid).toBe(false);
  });

  it('rejects duplicate and overlapping walls of same orientation', () => {
    const state = createInitialState();
    const w1: Wall = { row: 3, col: 3, orientation: 'horizontal' };
    state.walls.push(w1);

    // Exact duplicate
    expect(canPlaceWallGeometrically(state.walls, w1).valid).toBe(false);
    // Overlapping horizontal wall at col 2 (shares edge at col 3)
    expect(canPlaceWallGeometrically(state.walls, { row: 3, col: 2, orientation: 'horizontal' }).valid).toBe(false);
    // Overlapping horizontal wall at col 4 (shares edge at col 4)
    expect(canPlaceWallGeometrically(state.walls, { row: 3, col: 4, orientation: 'horizontal' }).valid).toBe(false);
    // Col 5 does not overlap!
    expect(canPlaceWallGeometrically(state.walls, { row: 3, col: 5, orientation: 'horizontal' }).valid).toBe(true);
  });

  it('rejects perpendicular crossing at the same anchor', () => {
    const state = createInitialState();
    state.walls.push({ row: 3, col: 3, orientation: 'horizontal' });

    // Vertical wall at same anchor (3, 3) crosses perpendicularly
    expect(canPlaceWallGeometrically(state.walls, { row: 3, col: 3, orientation: 'vertical' }).valid).toBe(false);
  });

  it('allows legal endpoint contact (T-junctions and L-corners)', () => {
    const state = createInitialState();
    state.walls.push({ row: 3, col: 3, orientation: 'horizontal' });

    // Vertical wall at (4, 3) touches horizontal endpoint
    expect(canPlaceWallGeometrically(state.walls, { row: 4, col: 3, orientation: 'vertical' }).valid).toBe(true);
    // Vertical wall at (3, 4) touches endpoint
    expect(canPlaceWallGeometrically(state.walls, { row: 3, col: 4, orientation: 'vertical' }).valid).toBe(true);
  });

  it('rejects wall placement when player has 0 walls remaining', () => {
    const state = createInitialState();
    state.p1WallsRemaining = 0;
    const check = isWallPlacementLegal(state, { row: 3, col: 3, orientation: 'horizontal' });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/No walls remaining/i);
  });

  it('rejects wall placement that blocks all routes to the goal for either player', () => {
    const state = createInitialState();
    // Put P2 at (0, 0)
    state.p2Pos = { row: 0, col: 0 };
    // Vertical wall at (0, 1) seals the east exit of 2x2 box {(0,0), (0,1), (1,0), (1,1)}
    state.walls.push({ row: 0, col: 1, orientation: 'vertical' });

    // Placing horizontal wall at (1, 0) meets vertical wall at an L-corner, sealing south exit
    const blockingWall: Wall = { row: 1, col: 0, orientation: 'horizontal' };
    const check = isWallPlacementLegal(state, blockingWall);
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/blocks every route/i);
  });
});

describe('Quoridor Engine - State Transitions & Winning', () => {
  it('decrements wall count and switches turn on valid wall placement', () => {
    const state = createInitialState();
    const action = {
      type: 'placeWall' as const,
      wall: { row: 2, col: 2, orientation: 'horizontal' as const },
    };

    const res = applyAction(state, action);
    expect(res.success).toBe(true);
    expect(res.state.p1WallsRemaining).toBe(9);
    expect(res.state.p2WallsRemaining).toBe(10);
    expect(res.state.walls).toHaveLength(1);
    expect(res.state.activePlayer).toBe('P2');
    expect(res.state.moveCount).toBe(1);

    // Verify source state was not mutated!
    expect(state.p1WallsRemaining).toBe(10);
    expect(state.walls).toHaveLength(0);
    expect(state.activePlayer).toBe('P1');
  });

  it('rejects invalid action leaving source state untouched', () => {
    const state = createInitialState();
    const invalidAction = {
      type: 'move' as const,
      to: { row: 0, col: 0 }, // Not a legal first move
    };

    const res = applyAction(state, invalidAction);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.state).toBe(state);
    expect(state.moveCount).toBe(0);
    expect(state.activePlayer).toBe('P1');
  });

  it('ends game immediately when player reaches goal row and rejects further actions', () => {
    const state = createInitialState();
    // Set P1 one step away from goal row 0, ensure P2 is elsewhere
    state.p1Pos = { row: 1, col: 4 };
    state.p2Pos = { row: 7, col: 0 };
    state.activePlayer = 'P1';

    const winMove = { type: 'move' as const, to: { row: 0, col: 4 } };
    const res = applyAction(state, winMove);

    expect(res.success).toBe(true);
    expect(res.state.winner).toBe('P1');
    expect(res.state.p1Pos).toEqual({ row: 0, col: 4 });

    // Further action after game end must be rejected
    const nextAction = { type: 'move' as const, to: { row: 1, col: 4 } };
    const postWinRes = applyAction(res.state, nextAction);
    expect(postWinRes.success).toBe(false);
    expect(postWinRes.error).toMatch(/concluded/i);
  });
});
