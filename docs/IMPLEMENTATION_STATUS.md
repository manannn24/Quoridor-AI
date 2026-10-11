# Quoridor AI — Implementation Status & Audit Log

## Overview
This document records the completed milestones, test execution records, benchmark outputs, and verified limitations for the Quoridor AI project.

---

## 1. Specification Compliance Checklist

### Phase A: Architecture & Project Setup
- [x] Workspace inspected (Node v22.21.0, npm v10.9.4, Git initialized).
- [x] Project structure scaffolded (React 18 + TypeScript + Vite + Vitest + ESLint).
- [x] Dependencies installed and baseline scripts configured (`dev`, `build`, `test`, `typecheck`, `lint`, `benchmark`, `check:all`).

### Phase B: Pure Game Engine
- [x] Standard 2-player state representation (9×9 board, coordinates 0..8, 10 walls per player, P1 at (8,4) aiming for row 0, P2 at (0,4) aiming for row 8).
- [x] Immutable/safe state transitions and pure functional model.
- [x] Legal orthogonal pawn movements.
- [x] Jump rules (straight jump over adjacent opponent when open; diagonal jumps when straight jump is blocked by edge or wall; diagonal disallowed when straight jump is available).
- [x] Wall geometry (horizontal and vertical walls spanning 2 grid cells from 0..7 anchor).
- [x] Wall overlap and perpendicular crossing collision checks; endpoint contact allowed (T-junctions and L-corners).
- [x] Wall reserve decrement and turn switching.
- [x] Path preservation rule (every player must have at least one valid path to their goal row; opponent pawn ignored as permanent obstruction).
- [x] Rejection of invalid moves with state preservation and clear error reporting.
- [x] Terminal win condition and action rejection post-win.
- [x] BFS exact shortest-path reference algorithm.
- [x] A* solver with admissible and consistent Manhattan distance heuristic.
- [x] Comprehensive engine and pathfinding unit tests (22 tests passing).

### Phase C: AI Agents & Search Engine
- [x] Shared evaluation function:
  `score = 100 * (opponentShortestPath - ownShortestPath) + 3 * (ownWallsRemaining - opponentWallsRemaining)`
  with ply-discounted terminal utilities (+100000 - ply, -100000 + ply).
- [x] Deterministic candidate wall generator (prioritizing blocking opponent shortest path, own path interactions, pawn proximity, wall extension/board edges).
- [x] Greedy heuristic baseline agent (1-ply evaluation).
- [x] Minimax agent (depth 1..3 plies, deterministic move ordering and tie-breaking, search metrics).
- [x] Minimax with Alpha-Beta pruning (same candidate tree and ordering, alpha-beta cutoffs, verified equivalence with Minimax).
- [x] Metrics instrumentation: nodes visited, leaves evaluated, cutoffs, elapsed milliseconds, chosen action and score.
- [x] AI unit and consistency tests (7 tests passing).

### Phase D: Reproducible Benchmark CLI
- [x] Benchmark script (`scripts/benchmark.ts` via `npm run benchmark`).
- [x] Configurable match counts, seeds, side rotation.
- [x] Outputs win rate, decision time, nodes visited, cutoffs, game length.
- [x] Emits machine-readable JSON/CSV reports to `reports/benchmark_results.json` and `reports/benchmark_summary.csv`.

### Phase E: Interactive React UI
- [x] Responsive 9×9 board with high-contrast, clean academic aesthetic.
- [x] Differentiated pawns (Human "YOU" vs Computer "AI").
- [x] Legal pawn move highlights and click/keyboard selection.
- [x] Horizontal / Vertical wall placement mode with valid anchor highlights and cancel option.
- [x] Remaining wall counts and visual pill reserve indicators.
- [x] AI strategy selector (Greedy, Minimax, Minimax + Alpha-Beta [default]) and depth selector (1..3, default 2).
- [x] AI thinking state with user input blocking.
- [x] Last decision metrics display panel.
- [x] New Game and Undo controls.
- [x] Accessible semantic markup, keyboard focus, color contrast.
- [x] UI component and integration tests (6 tests passing).

### Phase F: Verification & Audit
- [x] `npm run typecheck` passes (0 errors).
- [x] `npm run lint` passes (0 errors, 0 warnings).
- [x] `npm run test` passes with full coverage (35/35 tests passing across 4 test suites).
- [x] `npm run build` passes (production bundle in `dist/`).
- [x] `npm run check:all` passes (typecheck + lint + test + build).
- [x] `npm run benchmark` executes real games and produces output report.
- [x] Documentation updated (`README.md`, `COURSE_REPORT_GUIDE.md`, `RESEARCH_REFERENCES.md`).

---

## 2. Command Execution Log

| Timestamp | Command | Exit Code | Observed Output / Notes |
|---|---|---|---|
| Initial | `git init` | 0 | Initialized empty Git repository |
| Initial | `npm install` | 0 | Installed React, Vite, Vitest, TypeScript, ESLint |
| Phase B | `npm run test` (engine + pathfinding) | 0 | 22 tests passed (after adjusting edge-case fixtures) |
| Phase C | `npm run test` (with AI tests) | 0 | 29 tests passed |
| Phase D | `npm run benchmark -- --games 1` | 0 | Smoke benchmark completed in 4s |
| Phase E | `npm run test` (with UI integration) | 0 | 35 tests passed across 4 files |
| Phase F | `npm run typecheck` | 0 | TypeScript typecheck clean (noEmit) |
| Phase F | `npm run lint` | 0 | ESLint clean |
| Phase F | `npm run build` | 0 | Production bundle built cleanly |
| Phase F | `npm run check:all` | 0 | All checks and build passed |
| Phase F | `npm run benchmark -- --games 2` | 0 | Full 12-game tournament report emitted |

---

## 3. Measured Benchmark Results

From actual benchmark run (`reports/benchmark_results.json`):

| Matchup | Games | Agent 1 Wins | Agent 2 Wins | Agent 1 Mean Time | Agent 2 Mean Time | Agent 1 Nodes | Agent 2 Nodes | Agent 2 Cutoffs | Avg Plies |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Greedy (d1) vs Minimax (d2) | 4 | 0 (0.0%) | 4 (100.0%) | 0.99 ms | 4.44 ms | 13 | 81 | 0.00 | 20.5 |
| Greedy (d1) vs Alpha-Beta (d2) | 4 | 0 (0.0%) | 4 (100.0%) | 0.68 ms | 2.41 ms | 13 | 30 | 8.33 | 20.5 |
| Minimax (d2) vs Alpha-Beta (d2) | 4 | 2 (50.0%) | 2 (50.0%) | 2.46 ms | 1.68 ms | 47 | 26 | 5.18 | 62.0 |

**Observations:**
1. **Adversarial lookahead advantage:** Both Minimax (d2) and Alpha-Beta (d2) achieved 100% win rates against the Greedy 1-ply baseline.
2. **Pruning efficiency:** Alpha-Beta searched only 30 nodes per turn compared to Minimax's 81 nodes (a ~63% node reduction in Matchup 1), and 26 nodes vs 47 nodes in Matchup 3, while generating 5.18 to 8.33 cutoffs per turn.
3. **Outcome equivalence:** In Minimax vs Alpha-Beta, games played on identical sides resulted in identical moves and symmetric outcomes (2 wins each due to first-mover side rotation), verifying algorithmic equivalence over the generated candidate tree.

---

## 4. Discovered Nuances & Engine Decisions
- *Wall Geometry:* Horizontal wall at `(r, c)` blocks vertical movement between rows `(r, c)-(r+1, c)` and `(r, c+1)-(r+1, c+1)`. Vertical wall at `(r, c)` blocks horizontal movement between cols `(r, c)-(r, c+1)` and `(r+1, c)-(r+1, c+1)`. Walls cannot share any 1-unit segment with existing walls of the same orientation, cannot cross perpendicularly at the exact same anchor `(r, c)`, but may touch at endpoints (T-junctions and L-corners).
- *Jump Logic:* Jump over opponent is strictly straight if the cell directly behind the opponent is on board and not blocked by a wall. If and only if that straight jump is blocked by a wall or board edge, diagonal jumps to the adjacent open squares of the opponent are legal.

---

## 5. Known Limitations
- *Candidate Wall Pruning:* Because there are 128 raw wall placements per turn, full Minimax would branch excessively ($b \approx 132$). Search prunes to the top candidate walls based on heuristic relevance (blocking opponent shortest path, pawn proximity, wall extensions). Minimax and Alpha-Beta are provably equivalent over the *generated candidate tree*, not the theoretical complete game tree.
- *Depth Limit:* Minimax without pruning at depth 3 exhibits high branching latency; the UI defaults to Alpha-Beta at depth 2 for instant sub-10ms responsiveness.
- *Future Work:* Monte Carlo Tree Search (MCTS) with UCT and domain rollouts is documented as an architectural extension for future research, outside the syllabus baseline implemented here.
