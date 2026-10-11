import { Action, GameState } from '../game/types';
import { applyAction } from '../game/actions';
import { AIDecisionMetrics, AgentConfig } from './types';
import { evaluateState } from './evaluation';
import {
  getCandidateActions,
  DEFAULT_WALL_LIMIT_ROOT,
  DEFAULT_WALL_LIMIT_SUB,
} from './candidateActions';
import { chooseGreedyAction } from './greedyAgent';

export interface SearchOptions {
  wallLimitRoot?: number;
  wallLimitSub?: number;
}

/**
 * Minimax adversarial search without pruning.
 */
export function searchMinimax(
  state: GameState,
  depth: number,
  options: SearchOptions = {}
): AIDecisionMetrics {
  const startTime = performance.now();
  const rootPlayer = state.activePlayer;

  const wallLimitRoot = options.wallLimitRoot ?? DEFAULT_WALL_LIMIT_ROOT;
  const wallLimitSub = options.wallLimitSub ?? DEFAULT_WALL_LIMIT_SUB;

  let nodesVisited = 0;
  let leavesEvaluated = 0;

  function minimaxRec(
    currentState: GameState,
    currentDepth: number,
    plyFromRoot: number
  ): { score: number; bestAction: Action | null } {
    nodesVisited++;

    // Terminal node
    if (currentState.winner !== null) {
      leavesEvaluated++;
      return {
        score: evaluateState(currentState, rootPlayer, plyFromRoot),
        bestAction: null,
      };
    }

    // Leaf node reached at depth limit
    if (currentDepth <= 0) {
      leavesEvaluated++;
      return {
        score: evaluateState(currentState, rootPlayer, plyFromRoot),
        bestAction: null,
      };
    }

    const wallLimit = plyFromRoot === 0 ? wallLimitRoot : wallLimitSub;
    const candidates = getCandidateActions(currentState, wallLimit);

    if (candidates.length === 0) {
      leavesEvaluated++;
      return {
        score: evaluateState(currentState, rootPlayer, plyFromRoot),
        bestAction: null,
      };
    }

    const isMaximizing = currentState.activePlayer === rootPlayer;
    let bestScore = isMaximizing ? -Infinity : Infinity;
    let chosenAction: Action | null = null;

    for (const action of candidates) {
      const res = applyAction(currentState, action);
      if (!res.success) continue;

      const result = minimaxRec(res.state, currentDepth - 1, plyFromRoot + 1);

      if (isMaximizing) {
        if (chosenAction === null || result.score > bestScore) {
          bestScore = result.score;
          chosenAction = action;
        }
      } else {
        if (chosenAction === null || result.score < bestScore) {
          bestScore = result.score;
          chosenAction = action;
        }
      }
    }

    return { score: bestScore, bestAction: chosenAction };
  }

  const result = minimaxRec(state, depth, 0);
  const elapsedMs = performance.now() - startTime;

  return {
    strategy: 'minimax',
    requestedDepth: depth,
    completedDepth: depth,
    nodesVisited,
    leavesEvaluated,
    cutoffs: 0,
    elapsedMs,
    score: result.score,
    selectedAction: result.bestAction,
  };
}

/**
 * Minimax adversarial search with Alpha-Beta pruning.
 * Guarantees identical score and action as plain Minimax over the same candidate tree.
 */
export function searchAlphaBeta(
  state: GameState,
  depth: number,
  options: SearchOptions = {}
): AIDecisionMetrics {
  const startTime = performance.now();
  const rootPlayer = state.activePlayer;

  const wallLimitRoot = options.wallLimitRoot ?? DEFAULT_WALL_LIMIT_ROOT;
  const wallLimitSub = options.wallLimitSub ?? DEFAULT_WALL_LIMIT_SUB;

  let nodesVisited = 0;
  let leavesEvaluated = 0;
  let cutoffs = 0;

  function alphaBetaRec(
    currentState: GameState,
    currentDepth: number,
    alpha: number,
    beta: number,
    plyFromRoot: number
  ): { score: number; bestAction: Action | null } {
    nodesVisited++;

    // Terminal node
    if (currentState.winner !== null) {
      leavesEvaluated++;
      return {
        score: evaluateState(currentState, rootPlayer, plyFromRoot),
        bestAction: null,
      };
    }

    // Leaf node reached at depth limit
    if (currentDepth <= 0) {
      leavesEvaluated++;
      return {
        score: evaluateState(currentState, rootPlayer, plyFromRoot),
        bestAction: null,
      };
    }

    const wallLimit = plyFromRoot === 0 ? wallLimitRoot : wallLimitSub;
    const candidates = getCandidateActions(currentState, wallLimit);

    if (candidates.length === 0) {
      leavesEvaluated++;
      return {
        score: evaluateState(currentState, rootPlayer, plyFromRoot),
        bestAction: null,
      };
    }

    const isMaximizing = currentState.activePlayer === rootPlayer;
    let bestScore = isMaximizing ? -Infinity : Infinity;
    let chosenAction: Action | null = null;

    for (const action of candidates) {
      const res = applyAction(currentState, action);
      if (!res.success) continue;

      const result = alphaBetaRec(
        res.state,
        currentDepth - 1,
        alpha,
        beta,
        plyFromRoot + 1
      );

      if (isMaximizing) {
        if (chosenAction === null || result.score > bestScore) {
          bestScore = result.score;
          chosenAction = action;
        }
        if (bestScore > alpha) {
          alpha = bestScore;
        }
        if (beta <= alpha) {
          cutoffs++;
          break; // Beta cutoff
        }
      } else {
        if (chosenAction === null || result.score < bestScore) {
          bestScore = result.score;
          chosenAction = action;
        }
        if (bestScore < beta) {
          beta = bestScore;
        }
        if (beta <= alpha) {
          cutoffs++;
          break; // Alpha cutoff
        }
      }
    }

    return { score: bestScore, bestAction: chosenAction };
  }

  const result = alphaBetaRec(state, depth, -Infinity, Infinity, 0);
  const elapsedMs = performance.now() - startTime;

  return {
    strategy: 'alpha-beta',
    requestedDepth: depth,
    completedDepth: depth,
    nodesVisited,
    leavesEvaluated,
    cutoffs,
    elapsedMs,
    score: result.score,
    selectedAction: result.bestAction,
  };
}

/**
 * Unified action selector dispatching to the configured AI strategy.
 */
export function chooseAIAction(
  state: GameState,
  config: AgentConfig
): AIDecisionMetrics {
  const options: SearchOptions = {
    wallLimitRoot: config.candidateWallLimitRoot,
    wallLimitSub: config.candidateWallLimitSub,
  };

  switch (config.strategy) {
    case 'greedy':
      return chooseGreedyAction(state, options.wallLimitRoot);
    case 'minimax':
      return searchMinimax(state, config.depth, options);
    case 'alpha-beta':
      return searchAlphaBeta(state, config.depth, options);
    default:
      return searchAlphaBeta(state, config.depth, options);
  }
}
