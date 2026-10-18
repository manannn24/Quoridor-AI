import { GameState, Player } from '../game/types';
import { HeuristicWeights } from './types';
import {
  evaluateStateDetailed,
  resolveHeuristicWeights,
  HEURISTIC_PRESETS,
  WIN_SCORE,
} from './heuristics';

export const EVAL_CONFIG = {
  PATH_WEIGHT: HEURISTIC_PRESETS.H0.weights.pathWeight,
  WALL_WEIGHT: HEURISTIC_PRESETS.H0.weights.wallWeight,
  WIN_SCORE,
};

/**
 * Heuristic evaluation function for Quoridor states from the perspective of `evaluatingPlayer`.
 * Preserves 100% backward compatibility with audited baseline H0 formula:
 *   score = 100 * (opponentShortestPath - ownShortestPath) + 3 * (ownWalls - opponentWalls)
 *
 * Terminal values:
 *   Win: +100000 - plyFromRoot
 *   Loss: -100000 + plyFromRoot
 */
export function evaluateState(
  state: GameState,
  evaluatingPlayer: Player,
  plyFromRoot: number = 0,
  weights?: HeuristicWeights,
  recentSignatures?: string[]
): number {
  const effectiveWeights = weights ?? resolveHeuristicWeights('H0');
  const result = evaluateStateDetailed(
    state,
    evaluatingPlayer,
    effectiveWeights,
    plyFromRoot,
    recentSignatures
  );
  return result.score;
}
