import { GameState, Player } from '../game/types';
import { getOpponent } from '../game/state';
import { findShortestPathAStar } from '../game/pathfinding';

export const EVAL_CONFIG = {
  PATH_WEIGHT: 100,
  WALL_WEIGHT: 3,
  WIN_SCORE: 100000,
};

/**
 * Heuristic evaluation function for Quoridor states from the perspective of `evaluatingPlayer`.
 *
 * Formula:
 *   score = 100 * (opponentShortestPath - ownShortestPath) + 3 * (ownWalls - opponentWalls)
 *
 * Terminal values:
 *   Win: +100000 - plyFromRoot (prefers faster wins)
 *   Loss: -100000 + plyFromRoot (delays unavoidable losses)
 */
export function evaluateState(
  state: GameState,
  evaluatingPlayer: Player,
  plyFromRoot: number = 0
): number {
  const opponent = getOpponent(evaluatingPlayer);

  // Terminal state check
  if (state.winner !== null) {
    if (state.winner === evaluatingPlayer) {
      return EVAL_CONFIG.WIN_SCORE - plyFromRoot;
    } else {
      return -EVAL_CONFIG.WIN_SCORE + plyFromRoot;
    }
  }

  const ownPos = evaluatingPlayer === 'P1' ? state.p1Pos : state.p2Pos;
  const oppPos = evaluatingPlayer === 'P1' ? state.p2Pos : state.p1Pos;

  const ownWalls =
    evaluatingPlayer === 'P1'
      ? state.p1WallsRemaining
      : state.p2WallsRemaining;
  const oppWalls =
    evaluatingPlayer === 'P1'
      ? state.p2WallsRemaining
      : state.p1WallsRemaining;

  // Shortest path distances using A*
  const ownDist = findShortestPathAStar(ownPos, evaluatingPlayer, state.walls).distance;
  const oppDist = findShortestPathAStar(oppPos, opponent, state.walls).distance;

  // If defensively a path is completely blocked (should not happen in legal play)
  const safeOwnDist = Number.isFinite(ownDist) ? ownDist : 100;
  const safeOppDist = Number.isFinite(oppDist) ? oppDist : 100;

  const pathAdvantage = safeOppDist - safeOwnDist;
  const wallAdvantage = ownWalls - oppWalls;

  return (
    EVAL_CONFIG.PATH_WEIGHT * pathAdvantage +
    EVAL_CONFIG.WALL_WEIGHT * wallAdvantage
  );
}
