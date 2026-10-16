import { Action, GameState } from '../game/types';
import { applyAction } from '../game/actions';
import { AgentConfig, AgentDecisionResult, validateAndClampConfig } from './types';
import { resolveHeuristicWeights, evaluateStateDetailed } from './heuristics';
import { getCandidateActions, DEFAULT_WALL_LIMIT_ROOT } from './candidateActions';

/**
 * Greedy heuristic baseline agent: performs 1-step lookahead across candidate actions
 * and chooses the one maximizing the heuristic evaluation for the acting player.
 */
export function chooseGreedyAction(
  state: GameState,
  configOrWallLimit?: number | Partial<AgentConfig>,
  recentSignatures?: string[]
): AgentDecisionResult {
  const startTime = performance.now();
  const player = state.activePlayer;

  const config: AgentConfig =
    typeof configOrWallLimit === 'number'
      ? validateAndClampConfig({
          algorithm: 'greedy',
          candidateWallLimitRoot: configOrWallLimit,
        })
      : validateAndClampConfig({
          algorithm: 'greedy',
          ...configOrWallLimit,
        });

  const wallLimit = config.candidateWallLimitRoot ?? DEFAULT_WALL_LIMIT_ROOT;
  const weights = resolveHeuristicWeights(config.heuristicId, config.customWeights);

  if (state.winner !== null) {
    const { score, breakdown } = evaluateStateDetailed(
      state,
      player,
      weights,
      0,
      recentSignatures
    );
    return {
      algorithm: 'greedy',
      strategy: 'greedy',
      heuristicId: config.heuristicId ?? 'H0',
      requestedDepth: 1,
      completedDepth: 1,
      nodesVisited: 0,
      leavesEvaluated: 0,
      cutoffs: 0,
      elapsedMs: 0,
      score,
      selectedAction: null,
      featureBreakdown: breakdown,
    };
  }

  const candidateActions = getCandidateActions(state, wallLimit);

  if (candidateActions.length === 0) {
    return {
      algorithm: 'greedy',
      strategy: 'greedy',
      heuristicId: config.heuristicId ?? 'H0',
      requestedDepth: 1,
      completedDepth: 1,
      nodesVisited: 0,
      leavesEvaluated: 0,
      cutoffs: 0,
      elapsedMs: 0,
      score: -Infinity,
      selectedAction: null,
    };
  }

  let bestAction: Action | null = null;
  let bestScore = -Infinity;
  let bestBreakdown = undefined;
  let leavesEvaluated = 0;
  let nodesVisited = 0;

  for (const action of candidateActions) {
    nodesVisited++;
    const res = applyAction(state, action);
    if (!res.success) continue;

    leavesEvaluated++;
    const { score, breakdown } = evaluateStateDetailed(
      res.state,
      player,
      weights,
      1,
      recentSignatures
    );

    if (bestAction === null || score > bestScore) {
      bestScore = score;
      bestAction = action;
      bestBreakdown = breakdown;
    }
  }

  const elapsedMs = performance.now() - startTime;

  return {
    algorithm: 'greedy',
    strategy: 'greedy',
    heuristicId: config.heuristicId ?? 'H0',
    requestedDepth: 1,
    completedDepth: 1,
    nodesVisited,
    leavesEvaluated,
    cutoffs: 0,
    elapsedMs,
    score: bestScore,
    selectedAction: bestAction,
    featureBreakdown: bestBreakdown,
  };
}
