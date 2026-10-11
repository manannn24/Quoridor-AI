# Quoridor AI — Implementation Status & Audit Log

## Executive Summary
This document records the independent audit, testing, bug fixes, benchmark measurements, and stabilization results for the Quoridor AI project.

- **Audit Date:** 2026-10-11
- **Pre-Audit Baseline Commit:** `7f2aec7`
- **Final Audit Commit:** `785c718`
- **Initial Working Tree Status:** Clean (no untracked, staged, or unstaged changes)
- **Baseline Verification Result:** `check:all` (35 tests passing) and `benchmark -- --games 2` (12 games) passed.
- **Post-Audit Verification Result:** `check:all` (49 tests passing, 0 errors, 0 warnings) and `benchmark -- --games 2` (12 games) passed.

---

## 1. Audit Findings by Category and Severity

### Category A: UI & Asynchronous Resilience (High Severity)
- **Finding A1 (UI Lockup on Search Error):** In `src/app/App.tsx`, the asynchronous AI dispatch within `useEffect` did not wrap `chooseAIAction` in a `try ... catch ... finally` block. If any error was thrown during search (e.g. timeout, invalid position, or search exception), `setIsAiThinking(false)` was never reached, permanently locking user interaction across all board cells, wall controls, and the Undo button.
  - *Fix:* Wrapped AI search execution in `try ... catch ... finally`. An error banner is displayed to the user and `setIsAiThinking(false)` is guaranteed to run.
  - *Regression Test:* Added `displays error alert and unfreezes thinking state if AI search throws an error` in `tests/ui.test.tsx`.
- **Finding A2 (Stale Statistics After Undo):** In `src/app/App.tsx`, the `handleUndo` handler popped the board state from `history` but did not synchronize `lastAiMetrics`. Undoing a turn left stale metrics displayed for an AI move that was reverted, and undoing back to turn 0 showed metrics for a move that never persisted.
  - *Fix:* Added `metricsHistory` state to track AI decision metrics per turn. Undoing pops `metricsHistory` and restores the previous turn's metrics (or `null` when returning to the start).
  - *Regression Test:* Added `Undo Turn reverts human and AI move and clears last decision metrics when returning to start` in `tests/ui.test.tsx`.
- **Finding A3 (Keyboard Page Scroll on Action Activation):** In `src/components/Board.tsx`, the `onKeyDown` handlers for cell destinations and wall anchors listened for `Enter` and Space (`' '`) without calling `e.preventDefault()`, which could trigger unexpected browser page scrolling when using keyboard navigation.
  - *Fix:* Added `e.preventDefault()` when `Enter` or `' '` is pressed.

### Category B: AI Search Correctness & Candidate Safety (Medium Severity)
- **Finding B1 (Uninitialized Action Invalidation Vulnerability):** In `src/ai/minimax.ts` (`minimaxRec` and `alphaBetaRec`) and `src/ai/greedyAgent.ts`, `chosenAction` was initialized to `candidates[0]`. If `candidates[0]` failed `applyAction` (or if all child branches scored `-Infinity`), the function could return an unvalidated action.
  - *Fix:* Initialized `chosenAction` to `null` and set it upon the first valid applied action, ensuring no invalid candidate action can ever be returned.
- **Finding B2 (Unchecked Strategy String Fallback):** In `src/ai/minimax.ts`, `chooseAIAction` used a TypeScript switch statement without a runtime `default` fallback.
  - *Fix:* Added a default fallback to `alpha-beta` so malformed strategy arguments fail gracefully rather than returning undefined.
  - *Regression Test:* Added `safely falls back to alpha-beta when unknown strategy string is provided` in `tests/ai.test.ts`.

### Category C: Game Engine Geometry & Edge-Case Rules (Medium Severity)
- **Finding C1 (Unchecked Wall Orientation Types):** In `src/game/walls.ts`, `canPlaceWallGeometrically` checked anchor bounds (0..7) and overlap/crossing collisions, but did not guard against invalid orientation strings at runtime (e.g. `'diagonal'`), which could bypass edge blocking and corrupt wall lists.
  - *Fix:* Added defensive orientation check `newWall.orientation !== 'horizontal' && newWall.orientation !== 'vertical'` returning `{ valid: false, reason: ... }`.
  - *Regression Test:* Added `rejects invalid wall orientations` in `tests/engine.test.ts`.
- **Finding C2 (Untested Legal Action Enumeration):** `getAllLegalActions` in `src/game/actions.ts` existed in the engine but had zero unit test coverage.
  - *Fix:* Added unit tests verifying exact legal action count on initial board (131: 3 pawn moves + 128 wall actions), 0-wall reserve state (pawn moves only), and game-concluded state (empty array).
- **Finding C3 (Jump Rule Boundary & Wall Occlusion Coverage):** In `src/game/movement.ts`, standard Quoridor diagonal jump rules were implemented correctly, but test suites lacked verification for:
  - Straight jump blocked by a wall when one diagonal landing square is off-board (at column 0 or 8).
  - Straight jump blocked and both diagonal paths blocked by walls.
  - *Fix:* Added targeted regression tests in `tests/engine.test.ts`.

### Category D: Pathfinding Verification & Admissibility (Low Severity / Documentation)
- **Finding D1 (A* Optimality Domain):** A* uses the Manhattan distance heuristic to the player's goal row (`h(pos) = Math.abs(pos.row - goalRow)`). This heuristic is mathematically admissible ($h(n) \le h^*(n)$) and consistent ($|h(u) - h(v)| \le 1 = \text{cost}(u, v)$) for orthogonal grid movements on the 81-cell static wall graph.
  - *Crucial Distinction:* Pathfinding calculates shortest routes ignoring dynamic opponent pawn presence and jump edges (as per standard Quoridor rule models where walls must not permanently cut off goals, but pawns can move and be jumped). On this orthogonal wall graph, A* is provably optimal and returns the exact same distance as BFS. However, this distance is a static board heuristic, not a full game-tree distance.
  - *Regression Test:* Added step-by-step path validity check (ensuring all path edges are open and orthogonal) and serpentine zigzag corridor tests in `tests/pathfinding.test.ts`.

### Category E: Benchmark Symmetry & Measurement Integrity (Low Severity)
- **Finding E1 (Asymmetric Cutoff Reporting in CLI):** In `scripts/benchmark.ts`, the console summary table and CSV output omitted `A1 Cutoffs`, only displaying `A2 Cutoffs`. If a benchmark pairing configured Agent 1 with Alpha-Beta, its cutoffs were lost from the summary.
  - *Fix:* Updated `benchmark.ts` to include `A1 Cutoffs` in the console table and `A1_MeanCutoffs` in `reports/benchmark_summary.csv`.
- **Finding E2 (Determinism & Sample Size Caveat):** The engine, candidate wall generator, and search tie-breaking are 100% deterministic. Consequently, running repeated games from the exact same initial state with identical agent configurations produces identical move sequences. The benchmark rotation (Agent 1 as P1 vs Agent 2 as P1) tests both starting positions, but 2 or 4 games per pairing is a smoke/verification test rather than a stochastic performance sample.

---

## 2. Command Execution & Verification Log

| Stage | Command | Exit Code | Results |
|---|---|---:|---|
| **Baseline** | `git status` | 0 | Clean working tree on `main` at `7f2aec7` |
| **Baseline** | `npm run check:all` | 0 | Typecheck clean, lint clean, 35/35 tests passed, production build clean |
| **Baseline** | `npm run benchmark -- --games 2` | 0 | 12 games executed across 3 matchups |
| **Post-Fix** | `npm run typecheck` | 0 | TypeScript typecheck clean (noEmit) |
| **Post-Fix** | `npm run lint` | 0 | ESLint clean (0 errors, 0 warnings) |
| **Post-Fix** | `npm run test` | 0 | **49/49 tests passed** across 4 test suites (+14 tests added) |
| **Post-Fix** | `npm run build` | 0 | Production bundle built cleanly in `dist/` |
| **Post-Fix** | `npm run check:all` | 0 | All verification checks passed |
| **Post-Fix** | `npm run benchmark -- --games 2` | 0 | Benchmark completed with symmetric metric tables |

---

## 3. Measured Benchmark Results (Post-Audit)

From `reports/benchmark_results.json` (`npm run benchmark -- --games 2`):

| Matchup | Games | Agent 1 Wins | Agent 2 Wins | A1 Mean Time (ms) | A2 Mean Time (ms) | A1 Mean Nodes | A2 Mean Nodes | A1 Cutoffs | A2 Cutoffs | Avg Plies |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Greedy (d1) vs Minimax (d2) | 4 | 0 (0.0%) | 4 (100.0%) | 1.80 | 7.32 | 13 | 81 | 0.00 | 0.00 | 20.5 |
| Greedy (d1) vs Alpha-Beta (d2) | 4 | 0 (0.0%) | 4 (100.0%) | 1.05 | 3.57 | 13 | 30 | 0.00 | 8.33 | 20.5 |
| Minimax (d2) vs Alpha-Beta (d2) | 4 | 2 (50.0%) | 2 (50.0%) | 4.78 | 3.15 | 47 | 26 | 0.00 | 5.18 | 62.0 |

### Key Benchmark Insights
1. **Algorithmic Equivalence:** In Minimax (d2) vs Alpha-Beta (d2), both agents make identical decisions on every ply when given identical positions, yielding symmetric 2-2 game outcomes due to side rotation.
2. **Pruning Efficiency:** Alpha-Beta reduces node expansions from 81 to 30 nodes/turn vs Greedy, and from 47 to 26 nodes/turn vs Minimax (~45% node reduction), generating an average of 5.18 cutoffs per turn at depth 2.
3. **Execution Latency:** Alpha-Beta exhibits lower mean decision times (3.15 ms vs 4.78 ms for Minimax at depth 2), maintaining interactive 60fps performance in the browser.

---

## 4. Tests Added & Modified Summary

Total test count increased from **35 to 49 tests**:

- `tests/engine.test.ts` (17 -> 23 tests):
  - Added `rejects invalid wall orientations`
  - Added `allows only in-bounds diagonal jump when one diagonal is off-board`
  - Added `blocks all jumps when straight jump and both diagonals are blocked by walls`
  - Added rejection of wall placement after game conclusion
  - Added `getAllLegalActions` initial state count verification (131 actions)
  - Added `getAllLegalActions` 0-wall reserve check
  - Added `getAllLegalActions` post-win empty check
- `tests/pathfinding.test.ts` (5 -> 7 tests):
  - Added `guarantees that every consecutive step in the path is a valid unblocked orthogonal move`
  - Added `evaluates identical distances on winding serpentine detour corridors`
- `tests/ai.test.ts` (7 -> 11 tests):
  - Added Minimax vs Alpha-Beta equivalence in 0-wall late game
  - Added deterministic result verification across repeated searches
  - Added candidate action legality and non-emptiness check
  - Added safe fallback for unknown strategy string
- `tests/ui.test.tsx` (6 -> 8 tests):
  - Added `Undo Turn reverts human and AI move and clears last decision metrics when returning to start`
  - Added `displays error alert and unfreezes thinking state if AI search throws an error`

---

## 5. Scope & Playing Strength Clarifications

1. **Rule Correctness vs Playing Strength:** Passing all unit tests and achieving 100% win rate against a 1-ply greedy baseline confirms game-rule correctness and search integrity. It does not establish master-level Quoridor play. Quoridor possesses an enormous state-action space ($b \approx 132$).
2. **Candidate Wall Pruning Limitation:** To achieve instant browser responsiveness without web workers, the AI filters wall candidates to the top heuristically relevant walls (e.g. 6–8 candidates at root). Alpha-Beta is provably optimal *over the generated candidate tree*, not over the unpruned game tree.
3. **Manual vs Automated Verification:** Automated tests cover game mechanics, jump geometries, pathfinding heuristics, Minimax/Alpha-Beta search equivalence, and UI state flows. Manual verification in the browser should validate interactive drag/click ergonomics, sound/visual feel, and edge-case browser resizing.

---

## 6. Manual Testing Checklist for Browser Verification

When launching `npm run dev` and testing at `http://localhost:5173`:
- [ ] **Standard Opening:** Play initial pawn move forward; verify AI responds within ~10ms and updates metrics panel.
- [ ] **Straight Jump:** Advance pawns until facing each other; click straight jump square directly behind AI pawn.
- [ ] **Wall Placement:** Click "Horizontal Wall", verify orange highlighted anchor points in grooves, hover to see preview, click valid anchor to place.
- [ ] **Wall Collision Feedback:** Click an anchor that would cross an existing wall; observe the error alert banner and state preservation.
- [ ] **No-Trapping Rule:** Attempt to place a wall that completely seals off either player; observe rejection feedback ("blocks every route").
- [ ] **Undo Flow:** Make 2 moves, click "Undo Turn"; verify pawn and wall reserves revert, and metrics panel updates correctly.
- [ ] **Strategy Switching:** Select Minimax or Greedy in AI Settings; verify search statistics (nodes, cutoffs) adapt accordingly.
- [ ] **End Game:** Walk pawn to row 0; verify victory banner appears, further clicks are disabled, and New Game resets cleanly.
