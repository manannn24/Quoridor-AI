import { describe, it, expect } from 'vitest';
import { createInitialState, cloneState } from '../src/game/state';
import { validateAction } from '../src/game/actions';
import { validateAndClampConfig, AgentAlgorithm } from '../src/ai/types';
import { searchMcts } from '../src/ai/mcts';
import { searchAlphaBeta, chooseAIAction } from '../src/ai/minimax';
import {
  resolveHeuristicWeights,
  evaluateStateDetailed,
  WIN_SCORE,
} from '../src/ai/heuristics';
import { getStateSignature, detectCycle } from '../src/ai/cycleDetection';

describe('Milestone A: Config Validation & Safety', () => {
  it('safely clamps invalid depths, iterations, and algorithm names', () => {
    // Over-limit depth and iterations
    const clamped1 = validateAndClampConfig({
      algorithm: 'minimax',
      depth: 10, // max is 4
      mctsIterations: 99999, // max is 5000
    });
    expect(clamped1.depth).toBe(4);
    expect(clamped1.mctsIterations).toBe(5000);

    // Negative / invalid values
    const clamped2 = validateAndClampConfig({
      algorithm: 'invalid-algo' as unknown as AgentAlgorithm,
      depth: -5,
      mctsIterations: 0,
      mctsExplorationParam: -1,
    });
    expect(clamped2.algorithm).toBe('alpha-beta');
    expect(clamped2.depth).toBe(1);
    expect(clamped2.mctsIterations).toBe(10);
    expect(clamped2.mctsExplorationParam).toBe(0.1);
  });
});

describe('Milestone C: Iterative Deepening & Cycle Diagnostics', () => {
  it('reports exact completed depth and obeys depth ceiling', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';

    const result = searchAlphaBeta(state, 2, { useIterativeDeepening: true });
    expect(result.requestedDepth).toBe(2);
    expect(result.completedDepth).toBe(2);
    expect(result.selectedAction).not.toBeNull();
    expect(validateAction(state, result.selectedAction!).valid).toBe(true);
  });

  it('stops at last completed iteration when interrupted by time budget', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';

    // Interrupted after depth 1 finishes, while searching depth 2
    let checks = 0;
    const result = searchAlphaBeta(state, 4, {
      useIterativeDeepening: true,
      isCancelled: () => {
        checks++;
        // Depth 1 finishes, cancel during depth 2
        return checks > 2;
      },
    });

    expect(result.timedOut).toBe(true);
    expect(result.completedDepth).toBe(1);
    expect(result.selectedAction).not.toBeNull();
    expect(validateAction(state, result.selectedAction!).valid).toBe(true);

    // 0ms budget stops before depth 1 starts, returning depth 0 with safe legal fallback
    const zeroBudget = searchAlphaBeta(state, 4, {
      timeBudgetMs: 0,
      useIterativeDeepening: true,
    });

    expect(zeroBudget.timedOut).toBe(true);
    expect(zeroBudget.completedDepth).toBe(0);
    expect(zeroBudget.selectedAction).not.toBeNull();
    expect(validateAction(state, zeroBudget.selectedAction!).valid).toBe(true);

    // Pre-cancelled search returns depth 0 with safe legal fallback
    const cancelled = searchAlphaBeta(state, 3, {
      isCancelled: () => true,
      useIterativeDeepening: true,
    });
    expect(cancelled.timedOut).toBe(true);
    expect(cancelled.completedDepth).toBe(0);
    expect(cancelled.selectedAction).not.toBeNull();
    expect(validateAction(state, cancelled.selectedAction!).valid).toBe(true);
  });

  it('canonical state signature is order-independent for walls and detects state differences', () => {
    const s1 = createInitialState();
    s1.walls = [
      { row: 1, col: 2, orientation: 'horizontal' },
      { row: 4, col: 5, orientation: 'vertical' },
    ];

    const s2 = createInitialState();
    // Identical walls inserted in reverse order
    s2.walls = [
      { row: 4, col: 5, orientation: 'vertical' },
      { row: 1, col: 2, orientation: 'horizontal' },
    ];

    expect(getStateSignature(s1)).toBe(getStateSignature(s2));

    // Changing player turn changes signature
    const s3 = cloneState(s1);
    s3.activePlayer = 'P2';
    expect(getStateSignature(s3)).not.toBe(getStateSignature(s1));

    // Changing wall counts changes signature
    const s4 = cloneState(s1);
    s4.p1WallsRemaining = 9;
    expect(getStateSignature(s4)).not.toBe(getStateSignature(s1));
  });

  it('cycle detector correctly flags repeated states without mutating game rules', () => {
    const s1 = createInitialState();
    const s2 = createInitialState();
    s2.p1Pos = { row: 7, col: 4 };
    s2.activePlayer = 'P2';

    // History: s1 -> s2 -> s1
    const history = [s1, s2, s1];
    const diag = detectCycle(history);
    expect(diag.isRepeated).toBe(true);
    expect(diag.repetitionCount).toBe(2);
    expect(diag.lastSeenPliesAgo).toBe(2);
  });
});

describe('Milestone D: Modular Heuristics Laboratory', () => {
  it('all presets yield finite, deterministic scores for fixed states', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';

    for (const presetId of ['H0', 'H1', 'H2', 'H3'] as const) {
      const weights = resolveHeuristicWeights(presetId);
      const res1 = evaluateStateDetailed(state, 'P2', weights);
      const res2 = evaluateStateDetailed(state, 'P2', weights);

      expect(Number.isFinite(res1.score)).toBe(true);
      expect(res1.score).toBe(res2.score);
    }
  });

  it('H0 strictly matches the audited baseline formula', () => {
    const state = createInitialState();
    state.p1Pos = { row: 6, col: 4 }; // dist = 6
    state.p2Pos = { row: 2, col: 4 }; // dist = 6
    state.p1WallsRemaining = 9;
    state.p2WallsRemaining = 10;

    const weights = resolveHeuristicWeights('H0');
    const { score, breakdown } = evaluateStateDetailed(state, 'P2', weights);

    // From P2 perspective:
    // ownDist = 6, oppDist = 6 => pathAdvantage = 0
    // ownWalls = 10, oppWalls = 9 => wallAdvantage = 1
    // Score = 100 * 0 + 3 * 1 = 3
    expect(breakdown.pathAdvantage).toBe(0);
    expect(breakdown.wallAdvantage).toBe(1);
    expect(score).toBe(3);
  });

  it('H1 ignores remaining walls and evaluates distance only', () => {
    const state = createInitialState();
    state.p1WallsRemaining = 1;
    state.p2WallsRemaining = 10;

    const weights = resolveHeuristicWeights('H1');
    const { score } = evaluateStateDetailed(state, 'P2', weights);
    // On symmetric board, distance advantage is 0, so score must be 0 despite wall difference
    expect(score).toBe(0);
  });

  it('H2 values wall reserves higher than baseline', () => {
    const state = createInitialState();
    state.p1WallsRemaining = 8;
    state.p2WallsRemaining = 10; // +2 walls for P2

    const h0Score = evaluateStateDetailed(state, 'P2', resolveHeuristicWeights('H0')).score;
    const h2Score = evaluateStateDetailed(state, 'P2', resolveHeuristicWeights('H2')).score;

    // H0: 2 * 3 = 6. H2: 2 * 15 = 30.
    expect(h0Score).toBe(6);
    expect(h2Score).toBe(30);
    expect(h2Score).toBeGreaterThan(h0Score);
  });

  it('terminal states dominate non-terminal evaluations across all presets', () => {
    const winState = createInitialState();
    winState.winner = 'P2';

    const lossState = createInitialState();
    lossState.winner = 'P1';

    for (const presetId of ['H0', 'H1', 'H2', 'H3'] as const) {
      const weights = resolveHeuristicWeights(presetId);
      const winEval = evaluateStateDetailed(winState, 'P2', weights).score;
      const lossEval = evaluateStateDetailed(lossState, 'P2', weights).score;

      expect(winEval).toBe(WIN_SCORE);
      expect(lossEval).toBe(-WIN_SCORE);
      expect(winEval).toBeGreaterThan(50000);
      expect(lossEval).toBeLessThan(-50000);
    }
  });

  it('feature breakdown components mathematically sum to total score', () => {
    const state = createInitialState();
    state.p1Pos = { row: 5, col: 4 };
    state.p2Pos = { row: 3, col: 4 };

    const weights = resolveHeuristicWeights('H3');
    const { score, breakdown } = evaluateStateDetailed(state, 'P2', weights);

    let sum = breakdown.weightedPathScore + breakdown.weightedWallScore;
    if (breakdown.disruptionBonus) sum += breakdown.disruptionBonus;
    if (breakdown.progressBonus) sum += breakdown.progressBonus;
    if (breakdown.cyclePenalty) sum -= breakdown.cyclePenalty;

    expect(score).toBe(sum);
  });
});

describe('Milestone E: Original MCTS Agent', () => {
  it('returns fully legal action from initial board state', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';

    const result = searchMcts(state, { iterations: 50, seed: 101 });
    expect(result.algorithm).toBe('mcts');
    expect(result.selectedAction).not.toBeNull();
    expect(validateAction(state, result.selectedAction!).valid).toBe(true);
    expect(result.mctsIterations).toBe(50);
    expect(result.rootActionStats).toBeDefined();
    expect(result.rootActionStats!.length).toBeGreaterThan(0);
  });

  it('leaves input state completely unmodified', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';
    const snapshot = cloneState(state);

    searchMcts(state, { iterations: 40, seed: 99 });

    expect(state.p1Pos).toEqual(snapshot.p1Pos);
    expect(state.p2Pos).toEqual(snapshot.p2Pos);
    expect(state.p1WallsRemaining).toBe(snapshot.p1WallsRemaining);
    expect(state.p2WallsRemaining).toBe(snapshot.p2WallsRemaining);
    expect(state.walls).toEqual(snapshot.walls);
    expect(state.activePlayer).toBe(snapshot.activePlayer);
    expect(state.winner).toBe(snapshot.winner);
  });

  it('is deterministic and reproducible when given a fixed seed and state', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';

    const res1 = searchMcts(state, { iterations: 60, seed: 777 });
    const res2 = searchMcts(state, { iterations: 60, seed: 777 });

    expect(res1.selectedAction).toEqual(res2.selectedAction);
    expect(res1.mctsIterations).toBe(res2.mctsIterations);
    expect(res1.score).toBe(res2.score);
  });

  it('chooses immediate winning move when one step from goal', () => {
    const state = createInitialState();
    state.p2Pos = { row: 7, col: 4 }; // goal is row 8
    state.p1Pos = { row: 2, col: 0 }; // ensure goal cell (8, 4) is unblocked
    state.activePlayer = 'P2';

    const result = searchMcts(state, { iterations: 80, seed: 42 });
    expect(result.selectedAction).toEqual({
      type: 'move',
      to: { row: 8, col: 4 },
    });
  });

  it('executes legally through dispatchAgent / chooseAIAction interface', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';

    const result = chooseAIAction(state, {
      algorithm: 'mcts',
      mctsIterations: 50,
      seed: 12345,
    });

    expect(result.algorithm).toBe('mcts');
    expect(result.selectedAction).not.toBeNull();
    expect(validateAction(state, result.selectedAction!).valid).toBe(true);
  });
});
