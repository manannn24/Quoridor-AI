import { GameState, Player } from '../game/types';
import { getOpponent } from '../game/state';
import { findShortestPathAStar } from '../game/pathfinding';
import { HeuristicPresetId, HeuristicWeights, FeatureBreakdown } from './types';
import { getStateSignature } from './cycleDetection';

export const WIN_SCORE = 100000;

export interface HeuristicPresetInfo {
  id: HeuristicPresetId;
  name: string;
  description: string;
  weights: HeuristicWeights;
}

export const HEURISTIC_PRESETS: Record<HeuristicPresetId, HeuristicPresetInfo> = {
  H0: {
    id: 'H0',
    name: 'H0 — Baseline',
    description: 'Existing audited baseline: 100 × (oppDist - ownDist) + 3 × (ownWalls - oppWalls).',
    weights: {
      pathWeight: 100,
      wallWeight: 3,
      disruptionWeight: 0,
      progressWeight: 0,
      cyclePenalty: 0,
    },
  },
  H1: {
    id: 'H1',
    name: 'H1 — Distance Only',
    description: 'Path advantage focus: 100 × (oppDist - ownDist) ignoring remaining wall counts.',
    weights: {
      pathWeight: 100,
      wallWeight: 0,
      disruptionWeight: 0,
      progressWeight: 0,
      cyclePenalty: 0,
    },
  },
  H2: {
    id: 'H2',
    name: 'H2 — Wall-Resource-Aware',
    description: 'Wall conservation focus: 100 × (oppDist - ownDist) + 15 × (ownWalls - oppWalls).',
    weights: {
      pathWeight: 100,
      wallWeight: 15,
      disruptionWeight: 0,
      progressWeight: 0,
      cyclePenalty: 0,
    },
  },
  H3: {
    id: 'H3',
    name: 'H3 — Strategic Composite',
    description: 'Composite: path advantage + walls + opponent detour disruption + forward goal advancement.',
    weights: {
      pathWeight: 100,
      wallWeight: 5,
      disruptionWeight: 20,
      progressWeight: 10,
      cyclePenalty: 0,
    },
  },
  custom: {
    id: 'custom',
    name: 'Custom Tuned Heuristic',
    description: 'User-customized feature weight parameters.',
    weights: {
      pathWeight: 100,
      wallWeight: 3,
      disruptionWeight: 0,
      progressWeight: 0,
      cyclePenalty: 0,
    },
  },
};

/**
 * Resolves effective weights from preset and optional custom overrides.
 */
export function resolveHeuristicWeights(
  presetId: HeuristicPresetId = 'H0',
  customWeights?: Partial<HeuristicWeights>
): HeuristicWeights {
  const base = HEURISTIC_PRESETS[presetId]?.weights ?? HEURISTIC_PRESETS.H0.weights;
  if (!customWeights) return { ...base };

  return {
    pathWeight: customWeights.pathWeight ?? base.pathWeight,
    wallWeight: customWeights.wallWeight ?? base.wallWeight,
    disruptionWeight: customWeights.disruptionWeight ?? base.disruptionWeight ?? 0,
    progressWeight: customWeights.progressWeight ?? base.progressWeight ?? 0,
    cyclePenalty: customWeights.cyclePenalty ?? base.cyclePenalty ?? 0,
  };
}

/**
 * Detailed state evaluation returning both total score and individual feature breakdown.
 */
export function evaluateStateDetailed(
  state: GameState,
  evaluatingPlayer: Player,
  weights: HeuristicWeights,
  plyFromRoot: number = 0,
  recentSignatures?: string[]
): { score: number; breakdown: FeatureBreakdown } {
  // Terminal win/loss check
  if (state.winner !== null) {
    const isWin = state.winner === evaluatingPlayer;
    const terminalScore = isWin
      ? WIN_SCORE - plyFromRoot
      : -WIN_SCORE + plyFromRoot;

    return {
      score: terminalScore,
      breakdown: {
        ownDist: isWin ? 0 : 8,
        oppDist: isWin ? 8 : 0,
        pathAdvantage: isWin ? 8 : -8,
        weightedPathScore: terminalScore,
        ownWalls: evaluatingPlayer === 'P1' ? state.p1WallsRemaining : state.p2WallsRemaining,
        oppWalls: evaluatingPlayer === 'P1' ? state.p2WallsRemaining : state.p1WallsRemaining,
        wallAdvantage: 0,
        weightedWallScore: 0,
        totalScore: terminalScore,
      },
    };
  }

  const opponent = getOpponent(evaluatingPlayer);
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

  // Shortest path distances via A*
  const ownDistRes = findShortestPathAStar(ownPos, evaluatingPlayer, state.walls);
  const oppDistRes = findShortestPathAStar(oppPos, opponent, state.walls);

  const ownDist = Number.isFinite(ownDistRes.distance) ? ownDistRes.distance : 100;
  const oppDist = Number.isFinite(oppDistRes.distance) ? oppDistRes.distance : 100;

  const pathAdvantage = oppDist - ownDist;
  const wallAdvantage = ownWalls - oppWalls;

  const weightedPathScore = weights.pathWeight * pathAdvantage;
  const weightedWallScore = weights.wallWeight * wallAdvantage;

  let totalScore = weightedPathScore + weightedWallScore;

  // Feature: Disruption bonus (H3)
  // Quantifies how much the opponent is delayed beyond simple Manhattan distance to goal
  let disruptionBonus = 0;
  if (weights.disruptionWeight && weights.disruptionWeight !== 0) {
    const oppManhattan =
      opponent === 'P1' ? oppPos.row : 8 - oppPos.row;
    const oppDetour = Math.max(0, oppDist - oppManhattan);
    disruptionBonus = weights.disruptionWeight * oppDetour;
    totalScore += disruptionBonus;
  }

  // Feature: Goal progress bonus (H3)
  // Rewards own pawn physical advancement toward the goal line
  let progressBonus = 0;
  if (weights.progressWeight && weights.progressWeight !== 0) {
    const ownAdvancement = Math.max(0, 8 - ownDist);
    progressBonus = weights.progressWeight * ownAdvancement;
    totalScore += progressBonus;
  }

  // Feature: Cycle penalty
  let cyclePenaltyScore = 0;
  if (weights.cyclePenalty && weights.cyclePenalty > 0 && recentSignatures && recentSignatures.length > 0) {
    const sig = getStateSignature(state);
    let occurrences = 0;
    for (const pastSig of recentSignatures) {
      if (pastSig === sig) occurrences++;
    }
    if (occurrences > 0) {
      cyclePenaltyScore = weights.cyclePenalty * occurrences;
      totalScore -= cyclePenaltyScore;
    }
  }

  const breakdown: FeatureBreakdown = {
    ownDist,
    oppDist,
    pathAdvantage,
    weightedPathScore,
    ownWalls,
    oppWalls,
    wallAdvantage,
    weightedWallScore,
    disruptionBonus: weights.disruptionWeight ? disruptionBonus : undefined,
    progressBonus: weights.progressWeight ? progressBonus : undefined,
    cyclePenalty: weights.cyclePenalty ? cyclePenaltyScore : undefined,
    totalScore,
  };

  return { score: totalScore, breakdown };
}
