import { Position, Player, Wall } from './types';
import { isEdgeBlocked, BOARD_SIZE } from './walls';

export interface PathResult {
  distance: number;
  path: Position[] | null;
}

/**
 * Returns the target goal row for a player.
 * P1 aims for row 0 (top), P2 aims for row 8 (bottom).
 */
export function getGoalRow(player: Player): number {
  return player === 'P1' ? 0 : BOARD_SIZE - 1;
}

/**
 * Checks if a position is on the player's goal row.
 */
export function isGoal(pos: Position, player: Player): boolean {
  return pos.row === getGoalRow(player);
}

/**
 * Admissible & consistent Manhattan distance heuristic for Quoridor goal row.
 * For P1 (goal row 0), h = pos.row.
 * For P2 (goal row 8), h = 8 - pos.row.
 */
export function manhattanGoalHeuristic(pos: Position, player: Player): number {
  const goalRow = getGoalRow(player);
  return Math.abs(pos.row - goalRow);
}

function posToIndex(pos: Position): number {
  return pos.row * BOARD_SIZE + pos.col;
}

function indexToPos(idx: number): Position {
  return {
    row: Math.floor(idx / BOARD_SIZE),
    col: idx % BOARD_SIZE,
  };
}

/**
 * Returns orthogonal neighbors that are on board and not blocked by walls.
 * Ignores opponent pawn presence, as pawns are mobile and can be jumped.
 */
export function getOpenOrthogonalNeighbors(
  pos: Position,
  walls: Wall[]
): Position[] {
  const neighbors: Position[] = [];
  const deltas: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const [dr, dc] of deltas) {
    const nr = pos.row + dr;
    const nc = pos.col + dc;
    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
      const neighbor: Position = { row: nr, col: nc };
      if (!isEdgeBlocked(walls, pos, neighbor)) {
        neighbors.push(neighbor);
      }
    }
  }

  return neighbors;
}

/**
 * Reference exact shortest-path solver using Breadth-First Search (BFS).
 */
export function findShortestPathBFS(
  startPos: Position,
  player: Player,
  walls: Wall[]
): PathResult {
  if (isGoal(startPos, player)) {
    return { distance: 0, path: [startPos] };
  }

  const startIdx = posToIndex(startPos);
  const visited = new Uint8Array(BOARD_SIZE * BOARD_SIZE);
  const parent = new Int16Array(BOARD_SIZE * BOARD_SIZE);
  parent.fill(-1);

  const queue: number[] = [startIdx];
  visited[startIdx] = 1;

  let goalIdx = -1;

  let head = 0;
  while (head < queue.length) {
    const currIdx = queue[head++];
    const currPos = indexToPos(currIdx);

    if (isGoal(currPos, player)) {
      goalIdx = currIdx;
      break;
    }

    const neighbors = getOpenOrthogonalNeighbors(currPos, walls);
    for (const next of neighbors) {
      const nextIdx = posToIndex(next);
      if (!visited[nextIdx]) {
        visited[nextIdx] = 1;
        parent[nextIdx] = currIdx;
        queue.push(nextIdx);
      }
    }
  }

  if (goalIdx === -1) {
    return { distance: Infinity, path: null };
  }

  // Reconstruct path
  const path: Position[] = [];
  let curr = goalIdx;
  while (curr !== -1) {
    path.push(indexToPos(curr));
    if (curr === startIdx) break;
    curr = parent[curr];
  }
  path.reverse();

  return { distance: path.length - 1, path };
}

/**
 * Production shortest-path solver using A* search with Manhattan heuristic.
 */
export function findShortestPathAStar(
  startPos: Position,
  player: Player,
  walls: Wall[]
): PathResult {
  if (isGoal(startPos, player)) {
    return { distance: 0, path: [startPos] };
  }

  const totalCells = BOARD_SIZE * BOARD_SIZE;
  const startIdx = posToIndex(startPos);

  const gScore = new Int16Array(totalCells);
  gScore.fill(-1); // -1 means unvisited / infinity
  gScore[startIdx] = 0;

  const fScore = new Int16Array(totalCells);
  fScore.fill(-1);
  fScore[startIdx] = manhattanGoalHeuristic(startPos, player);

  const parent = new Int16Array(totalCells);
  parent.fill(-1);

  const closedSet = new Uint8Array(totalCells);

  // Min-priority open set
  // Entries: { idx, f, h }
  interface AStarNode {
    idx: number;
    f: number;
    h: number;
  }
  const openSet: AStarNode[] = [
    { idx: startIdx, f: fScore[startIdx], h: fScore[startIdx] },
  ];

  let goalIdx = -1;

  while (openSet.length > 0) {
    // Deterministic selection: minimum fScore, tie-break by smaller h, then smaller idx
    let bestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      const a = openSet[i];
      const b = openSet[bestIdx];
      if (a.f < b.f || (a.f === b.f && (a.h < b.h || (a.h === b.h && a.idx < b.idx)))) {
        bestIdx = i;
      }
    }

    const current = openSet.splice(bestIdx, 1)[0];
    const currIdx = current.idx;

    if (closedSet[currIdx]) continue;
    closedSet[currIdx] = 1;

    const currPos = indexToPos(currIdx);
    if (isGoal(currPos, player)) {
      goalIdx = currIdx;
      break;
    }

    const currentG = gScore[currIdx];
    const neighbors = getOpenOrthogonalNeighbors(currPos, walls);

    for (const next of neighbors) {
      const nextIdx = posToIndex(next);
      if (closedSet[nextIdx]) continue;

      const tentativeG = currentG + 1;
      const prevG = gScore[nextIdx];

      if (prevG === -1 || tentativeG < prevG) {
        parent[nextIdx] = currIdx;
        gScore[nextIdx] = tentativeG;
        const h = manhattanGoalHeuristic(next, player);
        const f = tentativeG + h;
        fScore[nextIdx] = f;
        openSet.push({ idx: nextIdx, f, h });
      }
    }
  }

  if (goalIdx === -1) {
    return { distance: Infinity, path: null };
  }

  // Reconstruct path
  const path: Position[] = [];
  let curr = goalIdx;
  while (curr !== -1) {
    path.push(indexToPos(curr));
    if (curr === startIdx) break;
    curr = parent[curr];
  }
  path.reverse();

  return { distance: path.length - 1, path };
}

/**
 * Fast check whether a player has at least one valid path from `startPos` to goal row.
 */
export function hasPathToGoal(
  walls: Wall[],
  startPos: Position,
  player: Player
): boolean {
  if (isGoal(startPos, player)) return true;

  const visited = new Uint8Array(BOARD_SIZE * BOARD_SIZE);
  const startIdx = posToIndex(startPos);
  const queue: number[] = [startIdx];
  visited[startIdx] = 1;

  let head = 0;
  while (head < queue.length) {
    const currIdx = queue[head++];
    const currPos = indexToPos(currIdx);

    if (isGoal(currPos, player)) {
      return true;
    }

    const neighbors = getOpenOrthogonalNeighbors(currPos, walls);
    for (const next of neighbors) {
      const nextIdx = posToIndex(next);
      if (!visited[nextIdx]) {
        visited[nextIdx] = 1;
        queue.push(nextIdx);
      }
    }
  }

  return false;
}
