import { Action, GameState, Player } from '../game/types';
import { applyAction } from '../game/actions';
import { getOpponent } from '../game/state';
import { findShortestPathAStar } from '../game/pathfinding';
import {
  AgentDecisionResult,
  MctsRootActionStat,
} from './types';
import { getCandidateActions, DEFAULT_WALL_LIMIT_ROOT } from './candidateActions';
import { createRng } from './prng';
import { chooseGreedyAction } from './greedyAgent';

export interface MctsOptions {
  iterations?: number;
  timeBudgetMs?: number;
  explorationParam?: number;
  rolloutPlyCap?: number;
  seed?: number;
  candidateWallLimitRoot?: number;
  candidateWallLimitSub?: number;
  isCancelled?: () => boolean;
}

class MctsNode {
  state: GameState;
  parent: MctsNode | null;
  actionFromParent: Action | null;
  children: MctsNode[] = [];
  unexpandedActions: Action[];
  visits = 0;
  // Accumulated reward from the perspective of the player who took actionFromParent
  totalReward = 0;

  constructor(
    state: GameState,
    parent: MctsNode | null = null,
    actionFromParent: Action | null = null,
    wallLimit: number = 6
  ) {
    this.state = state;
    this.parent = parent;
    this.actionFromParent = actionFromParent;
    if (state.winner !== null) {
      this.unexpandedActions = [];
    } else {
      this.unexpandedActions = getCandidateActions(state, wallLimit);
    }
  }

  isFullyExpanded(): boolean {
    return this.unexpandedActions.length === 0;
  }

  isTerminal(): boolean {
    return this.state.winner !== null;
  }

  /**
   * Selects the child node maximizing the Upper Confidence Bound for Trees (UCT).
   */
  selectBestChild(explorationParam: number): MctsNode {
    let bestChild = this.children[0];
    let bestUct = -Infinity;
    const logParentVisits = Math.log(Math.max(1, this.visits));

    for (const child of this.children) {
      if (child.visits === 0) {
        return child;
      }
      const exploitation = child.totalReward / child.visits;
      const exploration = explorationParam * Math.sqrt(logParentVisits / child.visits);
      const uct = exploitation + exploration;

      if (uct > bestUct) {
        bestUct = uct;
        bestChild = child;
      }
    }

    return bestChild;
  }
}

/**
 * Monte Carlo Tree Search (MCTS) agent for Quoridor.
 *
 * Implements standard 4-stage pipeline:
 * 1. Selection (UCT)
 * 2. Expansion (legal candidate actions)
 * 3. Bounded legal rollout simulation with goal-progress heuristic
 * 4. Backpropagation of reward statistics
 */
export function searchMcts(
  state: GameState,
  options: MctsOptions = {}
): AgentDecisionResult {
  const startTime = performance.now();
  const rootPlayer = state.activePlayer;

  const iterations = options.iterations ?? 300;
  const timeBudgetMs = options.timeBudgetMs ?? null;
  const deadlineMs = timeBudgetMs !== null ? startTime + timeBudgetMs : null;
  const explorationParam = options.explorationParam ?? 1.414;
  const rolloutPlyCap = options.rolloutPlyCap ?? 30;
  const seed = options.seed ?? 42;
  const rng = createRng(seed);

  const wallLimitRoot = options.candidateWallLimitRoot ?? DEFAULT_WALL_LIMIT_ROOT;
  const wallLimitSub = options.candidateWallLimitSub ?? 4;

  // Immediate terminal state check
  if (state.winner !== null) {
    return {
      selectedAction: null,
      algorithm: 'mcts',
      strategy: 'mcts',
      heuristicId: 'MCTS-UCT',
      requestedDepth: 0,
      completedDepth: 0,
      elapsedMs: 0,
      score: state.winner === rootPlayer ? 100 : -100,
      nodesVisited: 1,
      leavesEvaluated: 1,
      cutoffs: 0,
      mctsIterations: 0,
      mctsRollouts: 0,
    };
  }

  const root = new MctsNode(state, null, null, wallLimitRoot);

  // If any candidate action wins the game immediately, select it directly
  for (const act of root.unexpandedActions) {
    const testRes = applyAction(state, act);
    if (testRes.success && testRes.state.winner === rootPlayer) {
      return {
        selectedAction: act,
        algorithm: 'mcts',
        strategy: 'mcts',
        heuristicId: 'MCTS-UCT',
        requestedDepth: iterations,
        completedDepth: iterations,
        elapsedMs: performance.now() - startTime,
        score: 100,
        nodesVisited: 1,
        leavesEvaluated: 1,
        cutoffs: 0,
        mctsIterations: 1,
        mctsRollouts: 1,
        rootActionStats: [{ action: act, visits: 1, winRate: 1.0, scoreAvg: 100 }],
        diagnosticNote: 'Immediate decisive winning move selected.',
      };
    }
  }

  // If no actions available
  if (root.unexpandedActions.length === 0) {
    return {
      selectedAction: null,
      algorithm: 'mcts',
      strategy: 'mcts',
      heuristicId: 'MCTS-UCT',
      requestedDepth: 0,
      completedDepth: 0,
      elapsedMs: 0,
      score: 0,
      nodesVisited: 1,
      leavesEvaluated: 0,
      cutoffs: 0,
      mctsIterations: 0,
      mctsRollouts: 0,
    };
  }

  let completedIterations = 0;
  let totalNodesVisited = 1;
  let totalRollouts = 0;
  let timedOut = false;

  for (let iter = 0; iter < iterations; iter++) {
    // Check timeout / cancellation
    if (options.isCancelled && options.isCancelled()) {
      timedOut = true;
      break;
    }
    if (deadlineMs !== null && performance.now() >= deadlineMs) {
      timedOut = true;
      break;
    }

    // --- 1. Selection ---
    let node = root;
    while (!node.isTerminal() && node.isFullyExpanded() && node.children.length > 0) {
      node = node.selectBestChild(explorationParam);
    }

    // --- 2. Expansion ---
    let simulationNode = node;
    if (!node.isTerminal() && node.unexpandedActions.length > 0) {
      // Pick next unexpanded action deterministically or pop
      const actionIndex = Math.floor(rng() * node.unexpandedActions.length);
      const action = node.unexpandedActions.splice(actionIndex, 1)[0];
      const res = applyAction(node.state, action);
      if (res.success) {
        const child = new MctsNode(res.state, node, action, wallLimitSub);
        node.children.push(child);
        totalNodesVisited++;
        simulationNode = child;
      }
    }

    // --- 3. Simulation / Rollout ---
    const moverPlayer = simulationNode.actionFromParent
      ? node.state.activePlayer
      : rootPlayer;

    const reward = runRollout(
      simulationNode.state,
      moverPlayer,
      rolloutPlyCap,
      rng
    );
    totalRollouts++;

    // --- 4. Backpropagation ---
    let curr: MctsNode | null = simulationNode;
    while (curr !== null) {
      curr.visits++;
      if (curr.parent) {
        // Player who made the move to enter curr:
        const actingPlayer = curr.parent.state.activePlayer;
        // Reward from acting player's perspective:
        const playerReward = actingPlayer === moverPlayer ? reward : 1.0 - reward;
        curr.totalReward += playerReward;
      } else {
        // Root node
        curr.totalReward += moverPlayer === rootPlayer ? reward : 1.0 - reward;
      }
      curr = curr.parent;
    }

    completedIterations++;
  }

  // Choose the root child with the highest visit count (most robust move)
  let bestChild: MctsNode | null = null;
  let maxVisits = -1;

  const rootActionStats: MctsRootActionStat[] = [];

  for (const child of root.children) {
    if (!child.actionFromParent) continue;
    const winRate = child.visits > 0 ? child.totalReward / child.visits : 0;
    rootActionStats.push({
      action: child.actionFromParent,
      visits: child.visits,
      winRate: parseFloat(winRate.toFixed(4)),
      scoreAvg: parseFloat((winRate * 100).toFixed(2)),
    });

    if (child.visits > maxVisits) {
      maxVisits = child.visits;
      bestChild = child;
    }
  }

  // Sort stats by visits descending
  rootActionStats.sort((a, b) => b.visits - a.visits);

  // Fallback if no iteration completed before timeout
  let selectedAction: Action | null = bestChild?.actionFromParent ?? null;
  if (!selectedAction) {
    const fallback = chooseGreedyAction(state, { candidateWallLimitRoot: wallLimitRoot });
    selectedAction = fallback.selectedAction;
  }

  const elapsedMs = performance.now() - startTime;
  const bestWinRate = bestChild && bestChild.visits > 0
    ? bestChild.totalReward / bestChild.visits
    : 0.5;

  return {
    selectedAction,
    algorithm: 'mcts',
    strategy: 'mcts',
    heuristicId: 'MCTS-UCT',
    requestedDepth: iterations,
    completedDepth: completedIterations,
    elapsedMs,
    score: parseFloat((bestWinRate * 100).toFixed(2)),
    nodesVisited: totalNodesVisited,
    leavesEvaluated: totalRollouts,
    cutoffs: 0,
    mctsIterations: completedIterations,
    mctsRollouts: totalRollouts,
    rootActionStats,
    timedOut,
    diagnosticNote: timedOut
      ? `MCTS stopped at ${completedIterations} of ${iterations} iterations due to time budget.`
      : undefined,
  };
}

/**
 * Lightweight, legal, Quoridor-aware rollout policy.
 * Biased towards pawn advancement to goal row, with occasional legal wall actions.
 * Returns reward in [0, 1] from the perspective of `evaluatingPlayer`.
 */
function runRollout(
  initialState: GameState,
  evaluatingPlayer: Player,
  plyCap: number,
  rng: () => number
): number {
  let simState = initialState;
  let plies = 0;

  while (simState.winner === null && plies < plyCap) {
    plies++;

    // Fast candidate generation: wall limit 2 for rollouts to ensure speed
    const candidates = getCandidateActions(simState, 2);
    if (candidates.length === 0) break;

    // Bias selection: separate pawn moves vs walls
    const pawnMoves: Action[] = [];
    const wallMoves: Action[] = [];
    for (const act of candidates) {
      if (act.type === 'move') pawnMoves.push(act);
      else wallMoves.push(act);
    }

    let chosenAction: Action;
    // 85% probability to advance pawn, 15% probability to place a wall if available
    if (pawnMoves.length > 0 && (wallMoves.length === 0 || rng() < 0.85)) {
      // Pick randomly among top pawn moves (already sorted by goal proximity)
      const pickIdx = Math.floor(rng() * Math.min(2, pawnMoves.length));
      chosenAction = pawnMoves[pickIdx];
    } else if (wallMoves.length > 0) {
      const pickIdx = Math.floor(rng() * wallMoves.length);
      chosenAction = wallMoves[pickIdx];
    } else {
      chosenAction = candidates[0];
    }

    const res = applyAction(simState, chosenAction);
    if (!res.success) break;
    simState = res.state;
  }

  // Evaluate terminal outcome or horizon cutoff
  if (simState.winner !== null) {
    return simState.winner === evaluatingPlayer ? 1.0 : 0.0;
  }

  // Horizon cutoff: estimate normalized advantage from shortest path difference
  const opponent = getOpponent(evaluatingPlayer);
  const ownPos = evaluatingPlayer === 'P1' ? simState.p1Pos : simState.p2Pos;
  const oppPos = evaluatingPlayer === 'P1' ? simState.p2Pos : simState.p1Pos;

  const ownDist = findShortestPathAStar(ownPos, evaluatingPlayer, simState.walls).distance;
  const oppDist = findShortestPathAStar(oppPos, opponent, simState.walls).distance;

  const safeOwn = Number.isFinite(ownDist) ? ownDist : 50;
  const safeOpp = Number.isFinite(oppDist) ? oppDist : 50;

  const diff = safeOpp - safeOwn; // positive if opponent is further from goal
  // Sigmoid / algebraic normalization mapping diff to (0, 1):
  return 0.5 + 0.5 * (diff / Math.sqrt(4 + diff * diff));
}
