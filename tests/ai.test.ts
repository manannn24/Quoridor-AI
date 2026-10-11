import { describe, it, expect } from 'vitest';
import { createInitialState, cloneState } from '../src/game/state';
import { chooseGreedyAction } from '../src/ai/greedyAgent';
import {
  searchMinimax,
  searchAlphaBeta,
  chooseAIAction,
} from '../src/ai/minimax';
import { AIStrategy } from '../src/ai/types';
import { getCandidateActions } from '../src/ai/candidateActions';
import { validateAction, applyAction } from '../src/game/actions';


describe('AI Agents - Legality and State Safety', () => {
  it('all three agents return fully legal actions on the initial board', () => {
    const state = createInitialState();
    // Computer is P2
    state.activePlayer = 'P2';

    const greedy = chooseGreedyAction(state);
    expect(greedy.selectedAction).not.toBeNull();
    expect(validateAction(state, greedy.selectedAction!).valid).toBe(true);

    const minimax = searchMinimax(state, 1);
    expect(minimax.selectedAction).not.toBeNull();
    expect(validateAction(state, minimax.selectedAction!).valid).toBe(true);

    const alphaBeta = searchAlphaBeta(state, 1);
    expect(alphaBeta.selectedAction).not.toBeNull();
    expect(validateAction(state, alphaBeta.selectedAction!).valid).toBe(true);
  });

  it('search execution leaves the source state completely unmodified', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';
    const snapshot = cloneState(state);

    searchAlphaBeta(state, 2);

    expect(state.p1Pos).toEqual(snapshot.p1Pos);
    expect(state.p2Pos).toEqual(snapshot.p2Pos);
    expect(state.p1WallsRemaining).toBe(snapshot.p1WallsRemaining);
    expect(state.p2WallsRemaining).toBe(snapshot.p2WallsRemaining);
    expect(state.walls).toEqual(snapshot.walls);
    expect(state.activePlayer).toBe(snapshot.activePlayer);
    expect(state.winner).toBe(snapshot.winner);
    expect(state.moveCount).toBe(snapshot.moveCount);
  });
});

describe('AI Agents - Tactical Win Selection', () => {
  it('chooses immediate winning pawn move over non-winning alternatives', () => {
    const state = createInitialState();
    // P2 is one step from goal row 8: at (7, 4), row 8 is goal
    state.p2Pos = { row: 7, col: 4 };
    state.p1Pos = { row: 5, col: 0 };
    state.activePlayer = 'P2';

    const greedy = chooseGreedyAction(state);
    expect(greedy.selectedAction).toEqual({
      type: 'move',
      to: { row: 8, col: 4 },
    });

    const minimax = searchMinimax(state, 1);
    expect(minimax.selectedAction).toEqual({
      type: 'move',
      to: { row: 8, col: 4 },
    });

    const alphaBeta = searchAlphaBeta(state, 1);
    expect(alphaBeta.selectedAction).toEqual({
      type: 'move',
      to: { row: 8, col: 4 },
    });
  });
});

describe('AI Agents - Minimax vs Alpha-Beta Equivalence', () => {
  it('Minimax and Alpha-Beta return identical score and action at depth 1', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';

    const mm = searchMinimax(state, 1);
    const ab = searchAlphaBeta(state, 1);

    expect(ab.score).toBe(mm.score);
    expect(ab.selectedAction).toEqual(mm.selectedAction);
    expect(mm.cutoffs).toBe(0);
  });

  it('Minimax and Alpha-Beta return identical score and action at depth 2', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';
    // Add a wall to create a non-trivial position
    state.walls.push({ row: 3, col: 4, orientation: 'horizontal' });

    const mm = searchMinimax(state, 2, { wallLimitRoot: 6, wallLimitSub: 4 });
    const ab = searchAlphaBeta(state, 2, { wallLimitRoot: 6, wallLimitSub: 4 });

    expect(ab.score).toBe(mm.score);
    expect(ab.selectedAction).toEqual(mm.selectedAction);
    expect(mm.cutoffs).toBe(0);
    // Alpha-Beta should visit fewer or equal nodes
    expect(ab.nodesVisited).toBeLessThanOrEqual(mm.nodesVisited);
  });

  it('records cutoffs in Alpha-Beta when pruning opportunities exist', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';

    // With depth 2 search across candidate actions, pruning occurs
    const ab = searchAlphaBeta(state, 2, { wallLimitRoot: 8, wallLimitSub: 6 });
    expect(ab.cutoffs).toBeGreaterThan(0);
  });

  it('Minimax and Alpha-Beta return identical score and action in late game with 0 walls remaining', () => {
    const state = createInitialState();
    state.p1WallsRemaining = 0;
    state.p2WallsRemaining = 0;
    state.p1Pos = { row: 4, col: 4 };
    state.p2Pos = { row: 3, col: 4 };
    state.activePlayer = 'P2';

    const mm = searchMinimax(state, 2);
    const ab = searchAlphaBeta(state, 2);

    expect(ab.score).toBe(mm.score);
    expect(ab.selectedAction).toEqual(mm.selectedAction);
  });

  it('produces identical decision and metrics deterministically across repeated searches', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';
    state.walls.push({ row: 2, col: 3, orientation: 'horizontal' });

    const run1 = searchAlphaBeta(state, 2, { wallLimitRoot: 6, wallLimitSub: 4 });
    const run2 = searchAlphaBeta(state, 2, { wallLimitRoot: 6, wallLimitSub: 4 });

    expect(run1.score).toBe(run2.score);
    expect(run1.selectedAction).toEqual(run2.selectedAction);
    expect(run1.nodesVisited).toBe(run2.nodesVisited);
    expect(run1.leavesEvaluated).toBe(run2.leavesEvaluated);
    expect(run1.cutoffs).toBe(run2.cutoffs);
  });
});

describe('AI Agents - Candidate Actions & Strategy Fallback', () => {
  it('generates non-empty candidate list where every action is legal in nonterminal states', () => {
    const state = createInitialState();
    const candidates = getCandidateActions(state, 8);
    expect(candidates.length).toBeGreaterThan(0);

    for (const action of candidates) {
      const validation = validateAction(state, action);
      expect(validation.valid).toBe(true);
    }
  });

  it('safely falls back to alpha-beta when unknown strategy string is provided', () => {
    const state = createInitialState();
    state.activePlayer = 'P2';
    const metrics = chooseAIAction(state, {
      strategy: 'unknown-algo' as unknown as AIStrategy,
      depth: 1,
    });
    expect(metrics.strategy).toBe('alpha-beta');
    expect(metrics.selectedAction).not.toBeNull();
  });
});

describe('AI Agents - Simulation Smoke Test', () => {
  it('simulates 6 plies of game without throwing or generating illegal actions', () => {
    let state = createInitialState();

    for (let ply = 0; ply < 6; ply++) {
      if (state.winner !== null) break;

      const metrics = chooseAIAction(state, {
        strategy: ply % 2 === 0 ? 'alpha-beta' : 'greedy',
        depth: 2,
        candidateWallLimitRoot: 6,
        candidateWallLimitSub: 4,
      });

      expect(metrics.selectedAction).not.toBeNull();
      const res = applyAction(state, metrics.selectedAction!);
      expect(res.success).toBe(true);
      state = res.state;
    }
  });
});
