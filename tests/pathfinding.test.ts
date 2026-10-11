import { describe, it, expect } from 'vitest';
import {
  findShortestPathBFS,
  findShortestPathAStar,
  hasPathToGoal,
} from '../src/game/pathfinding';
import { createInitialState } from '../src/game/state';
import { Wall, Position } from '../src/game/types';

describe('Pathfinding: BFS vs A*', () => {
  it('gives distance 0 when starting on goal row', () => {
    const p1GoalPos: Position = { row: 0, col: 4 };
    const p2GoalPos: Position = { row: 8, col: 2 };

    const bfsP1 = findShortestPathBFS(p1GoalPos, 'P1', []);
    const astarP1 = findShortestPathAStar(p1GoalPos, 'P1', []);
    expect(bfsP1.distance).toBe(0);
    expect(astarP1.distance).toBe(0);
    expect(bfsP1.path).toEqual([p1GoalPos]);
    expect(astarP1.path).toEqual([p1GoalPos]);

    const bfsP2 = findShortestPathBFS(p2GoalPos, 'P2', []);
    const astarP2 = findShortestPathAStar(p2GoalPos, 'P2', []);
    expect(bfsP2.distance).toBe(0);
    expect(astarP2.distance).toBe(0);
  });

  it('yields identical shortest path length on empty initial board', () => {
    const state = createInitialState();

    const bfsP1 = findShortestPathBFS(state.p1Pos, 'P1', state.walls);
    const astarP1 = findShortestPathAStar(state.p1Pos, 'P1', state.walls);

    expect(bfsP1.distance).toBe(8);
    expect(astarP1.distance).toBe(8);
    expect(astarP1.distance).toBe(bfsP1.distance);

    const bfsP2 = findShortestPathBFS(state.p2Pos, 'P2', state.walls);
    const astarP2 = findShortestPathAStar(state.p2Pos, 'P2', state.walls);

    expect(bfsP2.distance).toBe(8);
    expect(astarP2.distance).toBe(8);
    expect(astarP2.distance).toBe(bfsP2.distance);
  });

  it('yields identical shortest path length with complex maze-like walls', () => {
    const walls: Wall[] = [
      { row: 7, col: 3, orientation: 'horizontal' },
      { row: 7, col: 5, orientation: 'horizontal' },
      { row: 6, col: 4, orientation: 'vertical' },
      { row: 4, col: 4, orientation: 'vertical' },
      { row: 3, col: 2, orientation: 'horizontal' },
      { row: 2, col: 1, orientation: 'vertical' },
    ];

    const startPos: Position = { row: 8, col: 4 };
    const bfsRes = findShortestPathBFS(startPos, 'P1', walls);
    const astarRes = findShortestPathAStar(startPos, 'P1', walls);

    expect(bfsRes.path).not.toBeNull();
    expect(astarRes.path).not.toBeNull();
    expect(astarRes.distance).toBe(bfsRes.distance);
    expect(bfsRes.distance).toBeGreaterThan(8); // Wall detour
  });

  it('yields identical path lengths across 20 pseudo-random seeded legal states', () => {
    // Simple LCG for reproducible pseudo-random numbers
    let seed = 42;
    function rand() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }

    for (let testCase = 0; testCase < 20; testCase++) {
      const walls: Wall[] = [];
      const numWalls = Math.floor(rand() * 8) + 2;

      for (let w = 0; w < numWalls; w++) {
        const r = Math.floor(rand() * 8);
        const c = Math.floor(rand() * 8);
        const orientation = rand() > 0.5 ? 'horizontal' : 'vertical';
        const candidate: Wall = { row: r, col: c, orientation };

        // Test if adding this wall keeps paths alive
        const testWalls = [...walls, candidate];
        if (
          hasPathToGoal(testWalls, { row: 8, col: 4 }, 'P1') &&
          hasPathToGoal(testWalls, { row: 0, col: 4 }, 'P2')
        ) {
          walls.push(candidate);
        }
      }

      const p1Pos: Position = {
        row: Math.floor(rand() * 8) + 1,
        col: Math.floor(rand() * 9),
      };
      const p2Pos: Position = {
        row: Math.floor(rand() * 8),
        col: Math.floor(rand() * 9),
      };

      const bfsP1 = findShortestPathBFS(p1Pos, 'P1', walls);
      const astarP1 = findShortestPathAStar(p1Pos, 'P1', walls);
      expect(astarP1.distance).toBe(bfsP1.distance);

      const bfsP2 = findShortestPathBFS(p2Pos, 'P2', walls);
      const astarP2 = findShortestPathAStar(p2Pos, 'P2', walls);
      expect(astarP2.distance).toBe(bfsP2.distance);
    }
  });

  it('detects unreachable goal row defensively when fully boxed in', () => {
    // Completely box in (0, 0)
    const walls: Wall[] = [
      { row: 0, col: 0, orientation: 'horizontal' },
      { row: 0, col: 0, orientation: 'vertical' },
    ];

    // (0, 0) trying to reach row 8 (P2)
    const hasPath = hasPathToGoal(walls, { row: 0, col: 0 }, 'P2');
    expect(hasPath).toBe(false);

    const bfs = findShortestPathBFS({ row: 0, col: 0 }, 'P2', walls);
    expect(bfs.distance).toBe(Infinity);
    expect(bfs.path).toBeNull();

    const astar = findShortestPathAStar({ row: 0, col: 0 }, 'P2', walls);
    expect(astar.distance).toBe(Infinity);
    expect(astar.path).toBeNull();
  });
});
