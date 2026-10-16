import { Action, GameState } from '../game/types';
import { applyAction } from '../game/actions';
import {
  AgentDecisionResult,
  AgentConfig,
  HeuristicPresetId,
  HeuristicWeights,
  FeatureBreakdown,
  validateAndClampConfig,
} from './types';
import {
  resolveHeuristicWeights,
  evaluateStateDetailed,
  WIN_SCORE,
} from './heuristics';
import {
  getCandidateActions,
  DEFAULT_WALL_LIMIT_ROOT,
  DEFAULT_WALL_LIMIT_SUB,
} from './candidateActions';
import { chooseGreedyAction } from './greedyAgent';
import { searchMcts } from './mcts';

export interface SearchOptions {
  wallLimitRoot?: number;
  wallLimitSub?: number;
  heuristicId?: HeuristicPresetId;
  customWeights?: Partial<HeuristicWeights>;
  timeBudgetMs?: number;
  useIterativeDeepening?: boolean;
  recentSignatures?: string[];
  isCancelled?: () => boolean;
}

class TimeoutException extends Error {
  constructor() {
    super('Search timeout');
    this.name = 'TimeoutException';
  }
}

interface SingleDepthResult {
  score: number;
  bestAction: Action | null;
  nodesVisited: number;
  leavesEvaluated: number;
  cutoffs: number;
  breakdown?: FeatureBreakdown;
}

/**
 * Executes a single-depth search (Minimax or Alpha-Beta) with optional deadline check.
 */
function executeSearchAtDepth(
  state: GameState,
  targetDepth: number,
  isAlphaBeta: boolean,
  options: SearchOptions,
  deadlineMs: number | null,
  weights: HeuristicWeights
): SingleDepthResult {
  const rootPlayer = state.activePlayer;
  const wallLimitRoot = options.wallLimitRoot ?? DEFAULT_WALL_LIMIT_ROOT;
  const wallLimitSub = options.wallLimitSub ?? DEFAULT_WALL_LIMIT_SUB;

  let nodesVisited = 0;
  let leavesEvaluated = 0;
  let cutoffs = 0;
  let rootBreakdown: FeatureBreakdown | undefined = undefined;

  function checkBudget() {
    if (options.isCancelled && options.isCancelled()) {
      throw new TimeoutException();
    }
    if (deadlineMs !== null && performance.now() >= deadlineMs) {
      throw new TimeoutException();
    }
  }

  // Pre-check budget before starting this depth
  checkBudget();

  function searchRec(
    currentState: GameState,
    currentDepth: number,
    alpha: number,
    beta: number,
    plyFromRoot: number
  ): { score: number; bestAction: Action | null } {
    nodesVisited++;

    // Check budget every 16 nodes to reduce latency
    if ((nodesVisited & 15) === 0) {
      checkBudget();
    }

    // Terminal state
    if (currentState.winner !== null) {
      leavesEvaluated++;
      const { score, breakdown } = evaluateStateDetailed(
        currentState,
        rootPlayer,
        weights,
        plyFromRoot,
        options.recentSignatures
      );
      if (plyFromRoot === 0) rootBreakdown = breakdown;
      return { score, bestAction: null };
    }

    // Leaf node reached
    if (currentDepth <= 0) {
      leavesEvaluated++;
      const { score, breakdown } = evaluateStateDetailed(
        currentState,
        rootPlayer,
        weights,
        plyFromRoot,
        options.recentSignatures
      );
      if (plyFromRoot === 0) rootBreakdown = breakdown;
      return { score, bestAction: null };
    }

    const wallLimit = plyFromRoot === 0 ? wallLimitRoot : wallLimitSub;
    const candidates = getCandidateActions(currentState, wallLimit);

    if (candidates.length === 0) {
      leavesEvaluated++;
      const { score, breakdown } = evaluateStateDetailed(
        currentState,
        rootPlayer,
        weights,
        plyFromRoot,
        options.recentSignatures
      );
      if (plyFromRoot === 0) rootBreakdown = breakdown;
      return { score, bestAction: null };
    }

    const isMaximizing = currentState.activePlayer === rootPlayer;
    let bestScore = isMaximizing ? -Infinity : Infinity;
    let chosenAction: Action | null = null;

    for (const action of candidates) {
      const res = applyAction(currentState, action);
      if (!res.success) continue;

      const result = searchRec(
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
        if (isAlphaBeta) {
          if (bestScore > alpha) {
            alpha = bestScore;
          }
          if (beta <= alpha) {
            cutoffs++;
            break; // Beta cutoff
          }
        }
      } else {
        if (chosenAction === null || result.score < bestScore) {
          bestScore = result.score;
          chosenAction = action;
        }
        if (isAlphaBeta) {
          if (bestScore < beta) {
            beta = bestScore;
          }
          if (beta <= alpha) {
            cutoffs++;
            break; // Alpha cutoff
          }
        }
      }
    }

    return { score: bestScore, bestAction: chosenAction };
  }

  const result = searchRec(state, targetDepth, -Infinity, Infinity, 0);

  return {
    score: result.score,
    bestAction: result.bestAction,
    nodesVisited,
    leavesEvaluated,
    cutoffs,
    breakdown: rootBreakdown,
  };
}

/**
 * Minimax adversarial search without pruning, supporting iterative deepening and time budget.
 */
export function searchMinimax(
  state: GameState,
  depth: number,
  options: SearchOptions = {}
): AgentDecisionResult {
  return runAdversarialSearch(state, depth, false, options);
}

/**
 * Minimax adversarial search with Alpha-Beta pruning, supporting iterative deepening and time budget.
 */
export function searchAlphaBeta(
  state: GameState,
  depth: number,
  options: SearchOptions = {}
): AgentDecisionResult {
  return runAdversarialSearch(state, depth, true, options);
}

function runAdversarialSearch(
  state: GameState,
  requestedDepth: number,
  isAlphaBeta: boolean,
  options: SearchOptions
): AgentDecisionResult {
  const startTime = performance.now();
  const algorithm = isAlphaBeta ? 'alpha-beta' : 'minimax';
  const heuristicId = options.heuristicId ?? 'H0';
  const weights = resolveHeuristicWeights(heuristicId, options.customWeights);

  // Terminal state check at root
  if (state.winner !== null) {
    const { score, breakdown } = evaluateStateDetailed(
      state,
      state.activePlayer,
      weights,
      0,
      options.recentSignatures
    );
    return {
      selectedAction: null,
      algorithm,
      strategy: algorithm,
      heuristicId,
      requestedDepth,
      completedDepth: 0,
      elapsedMs: 0,
      score,
      nodesVisited: 0,
      leavesEvaluated: 0,
      cutoffs: 0,
      featureBreakdown: breakdown,
    };
  }

  const timeBudgetMs = options.timeBudgetMs ?? null;
  const deadlineMs = timeBudgetMs !== null ? startTime + timeBudgetMs : null;
  const useIterative =
    options.useIterativeDeepening ?? (timeBudgetMs !== null && requestedDepth > 1);

  let totalNodes = 0;
  let totalLeaves = 0;
  let totalCutoffs = 0;
  let completedDepth = 0;
  let lastResult: SingleDepthResult | null = null;
  let timedOut = false;
  let diagnosticNote: string | undefined = undefined;

  const startDepth = useIterative ? 1 : requestedDepth;
  const maxDepth = requestedDepth;

  for (let d = startDepth; d <= maxDepth; d++) {
    if (options.isCancelled && options.isCancelled()) {
      timedOut = true;
      diagnosticNote = 'Search cancelled before start of iteration.';
      break;
    }
    if (deadlineMs !== null && performance.now() >= deadlineMs) {
      timedOut = true;
      diagnosticNote = `Time budget of ${timeBudgetMs}ms reached before depth ${d}.`;
      break;
    }
    try {
      const iterResult = executeSearchAtDepth(
        state,
        d,
        isAlphaBeta,
        options,
        deadlineMs,
        weights
      );

      totalNodes += iterResult.nodesVisited;
      totalLeaves += iterResult.leavesEvaluated;
      totalCutoffs += iterResult.cutoffs;
      lastResult = iterResult;
      completedDepth = d;

      // Immediate decisive terminal win (+WIN_SCORE - 1)
      if (iterResult.score >= WIN_SCORE - 5) {
        diagnosticNote = `Immediate tactical win found at depth ${d}. Lookahead terminated early.`;
        break;
      }
    } catch (e) {
      if (e instanceof TimeoutException) {
        timedOut = true;
        diagnosticNote = `Time budget of ${timeBudgetMs}ms reached during depth ${d}. Returning best action from depth ${completedDepth}.`;
        break;
      }
      throw e;
    }
  }

  // Fallback if no iteration completed (e.g. deadline was 0ms or cancelled immediately)
  if (!lastResult || !lastResult.bestAction) {
    const fallback = chooseGreedyAction(state, {
      algorithm: 'greedy',
      heuristicId,
      customWeights: options.customWeights,
      candidateWallLimitRoot: options.wallLimitRoot,
    });
    return {
      selectedAction: fallback.selectedAction,
      algorithm,
      strategy: algorithm,
      heuristicId,
      requestedDepth,
      completedDepth: 0,
      elapsedMs: performance.now() - startTime,
      score: fallback.score,
      nodesVisited: totalNodes + fallback.nodesVisited,
      leavesEvaluated: totalLeaves + fallback.leavesEvaluated,
      cutoffs: totalCutoffs,
      featureBreakdown: fallback.featureBreakdown,
      timedOut: true,
      diagnosticNote:
        diagnosticNote ?? 'Search timed out before completing depth 1; safe legal fallback chosen.',
    };
  }

  const elapsedMs = performance.now() - startTime;

  return {
    selectedAction: lastResult.bestAction,
    algorithm,
    strategy: algorithm,
    heuristicId,
    requestedDepth,
    completedDepth,
    elapsedMs,
    score: lastResult.score,
    nodesVisited: totalNodes,
    leavesEvaluated: totalLeaves,
    cutoffs: totalCutoffs,
    featureBreakdown: lastResult.breakdown,
    timedOut,
    diagnosticNote,
  };
}

/**
 * Unified action selector dispatching to the configured AI strategy.
 */
export function chooseAIAction(
  state: GameState,
  configInput: Partial<AgentConfig>,
  options: {
    recentSignatures?: string[];
    isCancelled?: () => boolean;
  } = {}
): AgentDecisionResult {
  const config = validateAndClampConfig(configInput);
  const searchOpts: SearchOptions = {
    wallLimitRoot: config.candidateWallLimitRoot,
    wallLimitSub: config.candidateWallLimitSub,
    heuristicId: config.heuristicId,
    customWeights: config.customWeights,
    timeBudgetMs: config.timeBudgetMs,
    useIterativeDeepening: config.useIterativeDeepening,
    recentSignatures: options.recentSignatures,
    isCancelled: options.isCancelled,
  };

  switch (config.algorithm) {
    case 'greedy':
      return chooseGreedyAction(state, config, options.recentSignatures);
    case 'minimax':
      return searchMinimax(state, config.depth, searchOpts);
    case 'alpha-beta':
      return searchAlphaBeta(state, config.depth, searchOpts);
    case 'mcts':
      return searchMcts(state, {
        iterations: config.mctsIterations,
        timeBudgetMs: config.timeBudgetMs,
        explorationParam: config.mctsExplorationParam,
        rolloutPlyCap: config.mctsRolloutPlyCap,
        candidateWallLimitRoot: config.candidateWallLimitRoot,
        candidateWallLimitSub: config.candidateWallLimitSub,
        seed: config.seed,
        isCancelled: options.isCancelled,
      });
    default:
      return searchAlphaBeta(state, config.depth, searchOpts);
  }
}
