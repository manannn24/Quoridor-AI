import { Action, GameState } from '../game/types';
import { applyAction } from '../game/actions';
import { AIDecisionMetrics } from './types';
import { evaluateState } from './evaluation';
import { getCandidateActions, DEFAULT_WALL_LIMIT_ROOT } from './candidateActions';

/**
 * Greedy heuristic baseline agent: performs 1-step lookahead across candidate actions
 * and chooses the one maximizing the heuristic evaluation for the acting player.
 */
export function chooseGreedyAction(
  state: GameState,
  wallLimit: number = DEFAULT_WALL_LIMIT_ROOT
): AIDecisionMetrics {
  const startTime = performance.now();
  const player = state.activePlayer;

  if (state.winner !== null) {
    return {
      strategy: 'greedy',
      requestedDepth: 1,
      completedDepth: 1,
      nodesVisited: 0,
      leavesEvaluated: 0,
      cutoffs: 0,
      elapsedMs: 0,
      score: evaluateState(state, player, 0),
      selectedAction: null,
    };
  }

  const candidateActions = getCandidateActions(state, wallLimit);

  if (candidateActions.length === 0) {
    return {
      strategy: 'greedy',
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

  let bestAction: Action = candidateActions[0];
  let bestScore = -Infinity;
  let leavesEvaluated = 0;
  let nodesVisited = 0;

  for (const action of candidateActions) {
    nodesVisited++;
    const res = applyAction(state, action);
    if (!res.success) continue;

    leavesEvaluated++;
    const score = evaluateState(res.state, player, 1);

    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  const elapsedMs = performance.now() - startTime;

  return {
    strategy: 'greedy',
    requestedDepth: 1,
    completedDepth: 1,
    nodesVisited,
    leavesEvaluated,
    cutoffs: 0,
    elapsedMs,
    score: bestScore,
    selectedAction: bestAction,
  };
}
