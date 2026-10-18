# Intelligent Quoridor: AI Experimentation Platform

An original, polished, browser-based **Quoridor AI Experimentation Platform** demonstrating fundamental Artificial Intelligence techniques: state-space problem formulation, **BFS and A\*** shortest-path finding, modular heuristic evaluation, **Minimax adversarial search**, **Alpha-Beta pruning**, and an original **Monte Carlo Tree Search (MCTS)** agent.

Built with **React 18 + TypeScript + Vite**, featuring a decoupled rules engine, 70 automated Vitest unit and integration tests, an interactive AI-vs-AI Arena, an Automated Tournament Runner, and a CLI benchmark suite with CSV/JSON exports.

---

## 1. Quick Start & Execution

### Prerequisites
- **Node.js** (v18+ or v22+ recommended; verified on Node v22.21.0)
- **npm** (v9+ or v10+)

### Setup
```bash
# Install dependencies
npm ci
```

### Essential Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Launch local Vite development server (default: `http://localhost:3000`) |
| `npm run build` | Compile TypeScript and build production bundle into `dist/` |
| `npm run test` | Run Vitest automated test suite (70 unit and integration tests) |
| `npm run typecheck` | Run strict TypeScript validation (`tsc --noEmit`) |
| `npm run lint` | Run ESLint across all TypeScript source files |
| `npm run benchmark` | Run reproducible AI vs AI tournament and emit reports |
| `npm run check:all` | Comprehensive validation: typecheck + lint + test + build |

---

## 2. Platform Modes & Capabilities

The platform provides three core integrated modes via top navigation tabs:

### 🎮 Human vs AI
- Play against any AI agent: **Alpha-Beta (Recommended)**, **Minimax**, **Greedy Baseline**, or **MCTS**.
- Interactive SVG board with legal pawn move highlighting and wall placement preview with collision and path-blocking validation.
- Match controls: New Game, Undo Turn, and live decision metrics inspector (nodes visited, cutoffs, elapsed milliseconds, and selected action).

### ⚔️ AI vs AI Arena
- Configure Player 1 (Blue) and Player 2 (Red) independently with any algorithm, heuristic preset ($H_0$..$H_3$), depth, time budget, or MCTS iterations.
- Playback controls: **Play**, **Pause**, **Step 1 Ply**, and **Restart**.
- Configurable speed slider (50ms–1200ms) and safety Max Plies cap.
- Real-time **Cycle Repetition Detector** alerting when agents oscillate in repetitive pawn moves.
- Complete scrollable move history log with coordinate notation and per-move decision telemetry.

### 🏆 Tournaments
- Automated round-robin and head-to-head match runner with **strict side rotation** to eliminate first-mover tempo advantage.
- Built-in experiment presets:
  - **Standard Benchmark (6 Games):** Alpha-Beta vs Minimax vs Greedy.
  - **Heuristic Ablation (6 Games):** $H_0$ Baseline vs $H_1$ Distance vs $H_2$ Wall-Aware vs $H_3$ Composite.
  - **MCTS vs Alpha-Beta (4 Games):** Monte Carlo Tree Search (100 iters) vs Alpha-Beta ($d=2$).
  - **MCTS Budget Comparison (4 Games):** MCTS 50 iterations vs MCTS 150 iterations.
  - **Custom Configuration:** Full control over pairings, depth, iterations, plies cap, and PRNG seed.
- Summary analytics cards, side-specific win counts (`P1 Wins` vs `P2 Wins` with explicit denominators), mean decision times, and plies.
- One-click browser downloads for complete machine-readable **JSON reports** and formatted **CSV tables**.

*(Note: Supported heuristic presets $H_0$ Baseline, $H_1$ Distance, $H_2$ Wall-Aware, and $H_3$ Composite remain fully available as internal AI evaluation settings within Arena and Tournament agent configurations.)*

---

## 3. Architecture & Modular Structure

The codebase is organized into cleanly separated functional layers:

```text
d:\Quoridor_AI/
├── src/
│   ├── game/                   # Pure rules engine (zero UI/DOM dependencies)
│   │   ├── types.ts            # State, action, wall, and player types
│   │   ├── state.ts            # Immutable state creation, cloning, winner check
│   │   ├── walls.ts            # Geometry, blocked edge calculation, collision checks
│   │   ├── movement.ts         # Pawn movement, straight jumps, diagonal jumps
│   │   ├── pathfinding.ts      # BFS reference solver & A* shortest path solver
│   │   └── actions.ts          # Action validation, application, legal move generation
│   ├── ai/                     # Search algorithms & heuristic evaluation
│   │   ├── types.ts            # Standardized AgentConfig & AgentDecisionResult schemas
│   │   ├── prng.ts             # Deterministic 32-bit Mulberry32 PRNG
│   │   ├── cycleDetection.ts   # Canonical state signatures & repetition detector
│   │   ├── heuristics.ts       # Modular H0..H3 presets & detailed feature breakdown
│   │   ├── candidateActions.ts # Deterministic branching factor heuristic pruner
│   │   ├── greedyAgent.ts      # 1-ply greedy baseline agent
│   │   ├── minimax.ts          # Minimax, Alpha-Beta, and iterative deepening
│   │   └── mcts.ts             # Original Monte Carlo Tree Search agent
│   ├── arena/                  # Automated tournament & match execution engine
│   │   └── tournamentRunner.ts # Multi-game pairings, side rotation, CSV/JSON exporters
│   ├── components/             # React presentation components
│   │   ├── Board.tsx           # Scalable interactive SVG board with highlights
│   │   ├── Panel.tsx           # Human vs AI control panel and metrics
│   │   ├── ArenaView.tsx       # AI vs AI Arena with lifecycle controls
│   │   ├── TournamentView.tsx  # Tournament runner, progress, and download actions
│   │   └── Header.tsx          # Application header and navigation
│   ├── app/
│   │   └── App.tsx             # Main React application shell & tab routing
│   ├── styles/
│   │   └── index.css           # High-contrast, responsive CSS styling
│   └── main.tsx                # React DOM entry point
├── tests/                      # Automated Vitest test suites (70 tests)
│   ├── engine.test.ts          # State transitions, jumps, collisions, rules
│   ├── pathfinding.test.ts     # BFS vs A* equivalence, heuristics, mazes
│   ├── ai.test.ts              # Minimax, Alpha-Beta cutoffs, win detection
│   ├── experimentalAgents.test.ts # MCTS determinism, iterative deepening, cycle detection
│   ├── arenaAndTournament.test.tsx# Tab routing, Arena stepping, Tournament UI
│   └── ui.test.tsx             # Human play, undo, resets, and accessibility
├── scripts/
│   └── benchmark.ts            # CLI tournament suite with CSV/JSON output
├── reports/                    # Generated benchmark results
└── docs/                       # Specifications, audit records, and methodology
    ├── EXPERIMENTS_AND_METHODOLOGY.md # Detailed algorithmic and empirical paper
    ├── EXPERIMENT_PLATFORM_STATUS.md  # Implementation audit and checklist
    └── ...
```

---

## 4. AI Algorithms & Search Techniques

### A. Pathfinding: BFS vs. A*
- **BFS (Breadth-First Search):** Ground-truth exact shortest-path solver on the unweighted 81-cell board graph.
- **A\* Search:** Production shortest-path solver utilizing Manhattan distance $h(n) = |n.\text{row} - \text{goalRow}|$ to the closest square on the goal row.
- **Verification:** Unit tests confirm BFS and A* yield identical distances across empty boards, handcrafted wall labyrinths, and pseudo-random seeded boards.

### B. Minimax and Alpha-Beta Pruning
- **Minimax:** Full-tree depth-bounded search alternating between maximizing and minimizing plies.
- **Alpha-Beta Pruning:** Branch-and-bound cutoffs preserving the exact outcome of Minimax while evaluating 45%–63% fewer nodes.
- **Iterative Deepening:** Evaluates depths sequentially with wall-clock time budgets and graceful cancellation fallbacks.

### C. Original Monte Carlo Tree Search (MCTS)
- **Selection:** Upper Confidence bounds applied to Trees (UCT):
  $$\text{UCT}(s, a) = Q(s, a) + c \cdot \sqrt{\frac{\ln N(s)}{N(s, a)}}$$
- **Expansion:** Unvisited legal candidate actions are added to the search tree.
- **Simulation:** Bounded heuristic rollout policy biasing toward shortest-path advancement with bounded rollout caps and strict engine legality checks.
- **Backpropagation:** Propagates $+1.0$ (win), $-1.0$ (loss), or $0.0$ (draw/ply cap).
- **Academic Attribution:** Original implementation based on standard MCTS literature (Coulom 2006, Kocsis & Szepesvári 2006). Gorisanson repository cited as a research reference only; no external code was cloned or copied.

---

## 5. Benchmark CLI & Empirical Results

Run the reproducible benchmark tournament CLI:

```bash
# Run standard tournament (10 games side-rotated)
npm run benchmark

# Run heuristic ablation experiments
npm run benchmark -- --preset experiments

# Run MCTS vs Alpha-Beta comparison
npm run benchmark -- --preset mcts
```

### Actual Benchmark Summary (10 Games, Side-Rotated, Seed 42)
| Matchup | Config A | Config B | A Wins | B Wins | Draws | Mean Time A | Mean Time B | Mean Nodes A | Mean Nodes B | Avg Plies |
|---|---|---|---|---|---|---|---|---|---|---|
| **0** | Greedy ($d=1$) | Minimax ($d=2$) | **0 (0.0%)** | **2 (100.0%)** | 0 | 0.72 ms | 3.67 ms | 9 | 81 | 20.5 |
| **1** | Greedy ($d=1$) | Alpha-Beta ($d=2$) | **0 (0.0%)** | **2 (100.0%)** | 0 | 0.23 ms | 1.22 ms | 9 | 30 | 20.5 |
| **2** | Minimax ($d=2$) | Alpha-Beta ($d=2$) | **1 (50.0%)** | **1 (50.0%)** | 0 | 1.90 ms | 1.31 ms | 47 | 26 | 62.0 |
| **3** | Alpha-Beta ($H_0$) | Alpha-Beta ($H_2$) | **1 (50.0%)** | **1 (50.0%)** | 0 | 1.00 ms | 0.99 ms | 26 | 26 | 62.0 |
| **4** | Alpha-Beta ($d=2$) | MCTS (50 iters) | **1 (50.0%)** | **0 (0.0%)** | 1 | 1.32 ms | 72.92 ms | 29 | 51 | 65.0 |

---

## 6. Verification & Test Suite

All 70 unit and integration tests pass cleanly:
```bash
npm run check:all
```
This executes:
1. `tsc --noEmit` (0 type errors)
2. `eslint .` (0 warnings, 0 errors)
3. `vitest run` (70 passing tests across 6 suites)
4. `vite build` (production build succeeds in <1s)

Detailed documentation is available in [`docs/EXPERIMENTS_AND_METHODOLOGY.md`](file:///d:/Quoridor_AI/docs/EXPERIMENTS_AND_METHODOLOGY.md) and [`docs/EXPERIMENT_PLATFORM_STATUS.md`](file:///d:/Quoridor_AI/docs/EXPERIMENT_PLATFORM_STATUS.md).

---

## 7. Contributing & AI Agent Policy

- **Human Contributors:** Please review [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming conventions (`<person-name>/<short-task-name>`), local verification requirements, and the Pull Request workflow. Direct commits and pushes to `main` are prohibited.
- **AI Coding Agents:** Operating guidelines and constraints for autonomous AI assistants are specified in [AGENTS.md](AGENTS.md).

---

## 8. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
