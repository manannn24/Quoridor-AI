import { Action, GameState, Wall, Position } from '../game/types';
import { getLegalPawnMoves } from '../game/movement';
import { isWallPlacementLegal } from '../game/actions';
import { getOpponent } from '../game/state';
import { findShortestPathAStar, manhattanGoalHeuristic } from '../game/pathfinding';
import { MAX_WALL_ANCHOR } from '../game/walls';

export const DEFAULT_WALL_LIMIT_ROOT = 10;
export const DEFAULT_WALL_LIMIT_SUB = 6;

interface ScoredWall {
  wall: Wall;
  priority: number;
}

/**
 * Checks whether a candidate wall directly blocks movement between two adjacent cells `p1` and `p2`.
 */
function doesWallBlockEdge(wall: Wall, p1: Position, p2: Position): boolean {
  const dr = p2.row - p1.row;
  const dc = p2.col - p1.col;

  // Vertical edge between (r, c) and (r+1, c)
  if (dc === 0 && Math.abs(dr) === 1) {
    const minRow = Math.min(p1.row, p2.row);
    const col = p1.col;
    if (wall.orientation === 'horizontal' && wall.row === minRow) {
      return wall.col === col || wall.col === col - 1;
    }
    return false;
  }

  // Horizontal edge between (r, c) and (r, c+1)
  if (dr === 0 && Math.abs(dc) === 1) {
    const minCol = Math.min(p1.col, p2.col);
    const row = p1.row;
    if (wall.orientation === 'vertical' && wall.col === minCol) {
      return wall.row === row || wall.row === row - 1;
    }
    return false;
  }

  return false;
}

/**
 * Deterministically generates and orders legal candidate actions for a state.
 * Always includes all legal pawn moves (ordered by goal proximity), followed by
 * prioritized legal candidate walls up to `wallLimit`.
 */
export function getCandidateActions(
  state: GameState,
  wallLimit: number = DEFAULT_WALL_LIMIT_ROOT
): Action[] {
  if (state.winner !== null) return [];

  const activePlayer = state.activePlayer;
  const opponent = getOpponent(activePlayer);

  const ownPos = activePlayer === 'P1' ? state.p1Pos : state.p2Pos;
  const oppPos = activePlayer === 'P1' ? state.p2Pos : state.p1Pos;

  const actions: Action[] = [];

  // 1. Legal pawn moves
  const pawnMoves = getLegalPawnMoves(state, activePlayer);
  // Sort pawn moves by Manhattan distance to goal row ascending (advancing moves first)
  pawnMoves.sort((a, b) => {
    const distA = manhattanGoalHeuristic(a, activePlayer);
    const distB = manhattanGoalHeuristic(b, activePlayer);
    if (distA !== distB) return distA - distB;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  for (const move of pawnMoves) {
    actions.push({ type: 'move', to: move });
  }

  // 2. Candidate walls
  const remainingWalls =
    activePlayer === 'P1' ? state.p1WallsRemaining : state.p2WallsRemaining;

  if (remainingWalls > 0 && wallLimit > 0) {
    const oppPathResult = findShortestPathAStar(oppPos, opponent, state.walls);
    const oppPath = oppPathResult.path ?? [];

    const ownPathResult = findShortestPathAStar(ownPos, activePlayer, state.walls);
    const ownPath = ownPathResult.path ?? [];

    const scoredWalls: ScoredWall[] = [];

    for (let r = 0; r <= MAX_WALL_ANCHOR; r++) {
      for (let c = 0; c <= MAX_WALL_ANCHOR; c++) {
        for (const orientation of ['horizontal', 'vertical'] as const) {
          const wall: Wall = { row: r, col: c, orientation };

          let priority = 0;

          // Priority A: Blocks an edge on the opponent's shortest path
          if (oppPath.length > 1) {
            for (let i = 0; i < oppPath.length - 1; i++) {
              if (doesWallBlockEdge(wall, oppPath[i], oppPath[i + 1])) {
                // Higher priority for earlier edges along the opponent's path
                priority += 60 + Math.max(0, 10 - i) * 3;
                break;
              }
            }
          }

          // Priority B: Penalty if wall blocks own shortest path
          if (ownPath.length > 1) {
            for (let i = 0; i < Math.min(ownPath.length - 1, 4); i++) {
              if (doesWallBlockEdge(wall, ownPath[i], ownPath[i + 1])) {
                priority -= 35;
                break;
              }
            }
          }

          // Priority C: Proximity to opponent pawn (within 3 steps)
          const oppDist = Math.abs(r - oppPos.row) + Math.abs(c - oppPos.col);
          if (oppDist <= 3) {
            priority += (4 - oppDist) * 5;
          }

          // Priority D: Proximity to own pawn
          const ownDist = Math.abs(r - ownPos.row) + Math.abs(c - ownPos.col);
          if (ownDist <= 3) {
            priority += (4 - ownDist) * 2;
          }

          // Priority E: Continuation of an existing wall (connecting barriers)
          for (const existing of state.walls) {
            const anchorDist = Math.abs(r - existing.row) + Math.abs(c - existing.col);
            if (anchorDist <= 1) {
              priority += 12;
              break;
            }
          }

          // Priority F: Edges of the board (flanking walls)
          if (r === 0 || r === MAX_WALL_ANCHOR || c === 0 || c === MAX_WALL_ANCHOR) {
            priority += 4;
          }

          scoredWalls.push({ wall, priority });
        }
      }
    }

    // Deterministic sorting: priority desc, then row asc, col asc, orientation
    scoredWalls.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.wall.row !== b.wall.row) return a.wall.row - b.wall.row;
      if (a.wall.col !== b.wall.col) return a.wall.col - b.wall.col;
      return a.wall.orientation === 'horizontal' ? -1 : 1;
    });

    // Take top legal walls up to wallLimit
    let legalWallCount = 0;
    for (const item of scoredWalls) {
      if (legalWallCount >= wallLimit) break;
      const legality = isWallPlacementLegal(state, item.wall);
      if (legality.valid) {
        actions.push({ type: 'placeWall', wall: item.wall });
        legalWallCount += 1;
      }
    }
  }

  return actions;
}
