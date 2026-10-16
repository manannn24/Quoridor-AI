# Quoridor AI Experimentation Platform — Implementation Status & Audit Log

## 1. Verified Starting State
- **Repository Root:** `d:\Quoridor_AI`
- **Initial Audited Baseline Commit:** `6327684` (`docs: record final audit commit hash in status report`)
- **Initial Branch:** `main` (clean working tree, no remote configured)
- **Active Feature Branch:** `feature/ai-experimentation-platform`
- **Pre-flight Tests on Baseline:** 4 test files, 49 tests passing (100% pass rate).
- **Tooling Stack:** Node.js v22.21.0, npm 10.9.4, React 18, Vite 5, TypeScript 5.6, Vitest 2.1, ESLint 9.

---

## 2. Milestone Checklist

- [ ] **Milestone A: Configurable Shared Agent Architecture**
  - [ ] Standardized serializable `AgentConfig` interface for all agents (algorithm, heuristic, search depth, time budget, MCTS budget, candidate limits, seed).
  - [ ] Common `AgentDecisionResult` schema with discriminated algorithm metrics (nodes, cutoffs, MCTS iterations/rollouts, score, elapsed time, feature breakdown).
  - [ ] Clamping & validation for configurations; defensive handling of zero/invalid budgets.
  - [ ] State immutability guarantee: agents never mutate live UI state or sibling search branches.
  - [ ] Generation tokens / request cancellation safety to reject stale AI responses.
  - [ ] Unit tests for common agent interface, configuration validation, and legal move guarantees.

- [ ] **Milestone B: AI vs AI Arena Mode**
  - [ ] High-level navigation / mode selector: `Human vs AI`, `AI vs AI Arena`, `Experiments / Tournament`.
  - [ ] Independent side configuration cards for P1 and P2 (algorithm, heuristic preset, depth/iterations, budgets).
  - [ ] Arena lifecycle controls: Play/Start, Pause, Resume, Step one action, Restart game.
  - [ ] Playback delay / speed slider.
  - [ ] Move history list, path distance displays, active thinking indicators.
  - [ ] Asynchronous/non-blocking execution avoiding UI freezes during search.
  - [ ] Cancellation/invalidation safety: pausing, restarting, or reconfiguring immediately aborts or ignores in-flight operations.
  - [ ] Preservation of existing Human-vs-AI mode.
  - [ ] Arena component and lifecycle tests.

- [ ] **Milestone C: Search Depth, Time Budgets, and Cycle Diagnostics**
  - [ ] Configurable maximum search depth (plies) with conservative defaults.
  - [ ] Iterative deepening lookahead for Minimax/Alpha-Beta with wall-clock time budget cutoff.
  - [ ] Accurate completed depth reporting (never labeling partial iterations as complete).
  - [ ] Safe fallback action if budget expires before iteration 1 finishes.
  - [ ] Factual cycle / repetitive move detector using full board state signature (pawn positions, wall geometry, wall counts, player turn).
  - [ ] Repetition indicator in UI without modifying official Quoridor draw rules.
  - [ ] Optional experimental cycle penalty / tie-breaker preference (disabled by default).
  - [ ] Unit and diagnostic tests for depth, iterative deepening, time budgets, and cycle detection.

- [ ] **Milestone D: Experimental Heuristic Laboratory**
  - [ ] Modular heuristic architecture supporting multiple selectable evaluator presets:
    - `H0`: Existing baseline: `100 * (oppDist - ownDist) + 3 * (ownWalls - oppWalls)`.
    - `H1`: Distance-only: `oppDist - ownDist`.
    - `H2`: Wall-resource-aware: balanced path advantage with tunable wall valuation.
    - `H3`: Strategic composite: path advantage + walls remaining + opponent path disruption / safe progress term.
  - [ ] Configurable weight sliders / inputs for interactive tuning with "Reset to Preset".
  - [ ] Feature contribution inspector detailing individual feature weights and contributions for recent decisions.
  - [ ] Terminal utility domination ($\pm 100{,}000$) across all presets.
  - [ ] Fair heuristic matchup support (same algorithm and depth, different heuristic presets with side rotation).
  - [ ] Unit tests for preset determinism, terminal domination, and feature breakdown math.

- [ ] **Milestone E: Original Monte Carlo Tree Search (MCTS) Agent**
  - [ ] 4-stage pipeline: Selection (UCT formula), Expansion (unvisited legal actions), Simulation/Rollout (bounded legal rollout policy), Backpropagation (accumulating visit counts and rewards).
  - [ ] Quoridor-aware heuristic rollout policy biasing towards shortest-path progress with bounded rollout cap.
  - [ ] Strict game rule preservation: every simulated move and wall passes authoritative rule engine checks (no trapping, no crossings, no illegal jumps).
  - [ ] Seeded PRNG for deterministic, reproducible simulation runs.
  - [ ] Iteration budgets (e.g. 100, 250, 500, 1000) and time budget support.
  - [ ] Root action visit distribution and win rate tracking.
  - [ ] Unit tests for MCTS legality across early/mid/late game, state immutability, reproducibility with fixed seed, and bounded rollout termination.

- [ ] **Milestone F: Tournament Runner & Experiment Benchmarks**
  - [ ] Match runner supporting multi-game pairings, side rotation, seed derivation, and max plies safety caps.
  - [ ] Distinction between normal wins, losses, and capped/unfinished benchmark draws.
  - [ ] Standard presets: Greedy vs Minimax, Greedy vs Alpha-Beta, Minimax vs Alpha-Beta, Depth comparisons, H0 vs H1/H2/H3, Alpha-Beta vs MCTS.
  - [ ] Browser-based export of genuine JSON and CSV benchmark datasets.
  - [ ] Analytics dashboard with charts/tables showing win rates, decision times, node/rollout counts, and plies.
  - [ ] CLI benchmark runner upgrade supporting MCTS and heuristic comparisons (`npm run benchmark`).
  - [ ] Test coverage for tournament runner and statistics aggregation.

- [ ] **Milestone G: UI Integration, Accessibility & Final Audit**
  - [ ] Unified, polished UI integrating Game, Arena, Tournament, and Heuristics tabs.
  - [ ] Accessible semantic controls, high contrast, keyboard focus, and responsive layout.
  - [ ] Execution of `npm run check:all` (typecheck + lint + test + build).
  - [ ] Execution of a genuine benchmark run with MCTS and heuristic comparisons, saving reports to `reports/`.
  - [ ] Updated `README.md` and `docs/EXPERIMENTS_AND_METHODOLOGY.md`.
  - [ ] Review git diff, create sensible milestone commits, verify clean working tree.

---

## 3. Implementation Commit Log
*(Populated as milestone commits are created)*

| Commit SHA | Milestone | Summary |
|---|---|---|
| *(Pending)* | — | — |

---

## 4. Verification & Command Records
*(Populated as checks are executed)*

| Timestamp | Command | Exit Code | Summary / Notes |
|---|---|---|---|
| Baseline | `npm run test` | 0 | 49 passing tests on initial baseline commit 6327684 |

---

## 5. Known Limitations & Notes
*(To be updated during implementation)*
