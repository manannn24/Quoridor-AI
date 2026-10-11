# Intelligent Quoridor: Adversarial Search & Pathfinding AI

An original, polished, browser-based implementation of **Quoridor (Human vs. Computer)** demonstrating fundamental Artificial Intelligence techniques: state-space problem formulation, **BFS and A\*** shortest-path finding, heuristic evaluation, **Minimax adversarial search**, and **Alpha-Beta pruning**.

Built with **React 18 + TypeScript + Vite**, featuring a decoupled rules engine, test suite with 35 tests, and an automated benchmark runner.

---

## 1. Quick Start & Execution

### Prerequisites
- **Node.js** (v18+ or v22+ recommended; verified on Node v22.21.0)
- **npm** (v9+ or v10+)

### Setup
```bash
# Install dependencies
npm install
```

### Essential Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Launch local Vite development server (default: `http://localhost:3000`) |
| `npm run build` | Compile TypeScript and build production bundle into `dist/` |
| `npm run test` | Run Vitest automated test suite (35 unit and integration tests) |
| `npm run typecheck` | Run strict TypeScript validation (`tsc --noEmit`) |
| `npm run lint` | Run ESLint across all TypeScript source files |
| `npm run benchmark` | Run reproducible AI vs AI tournament and emit reports |
| `npm run check:all` | Comprehensive validation: typecheck + lint + test + build |

---

## 2. Game Rules & Mechanics

The game adheres to the official 2-player Quoridor rule set:

1. **Board & Setup:**
   - 9×9 grid of 81 cells (coordinates `row: 0..8`, `col: 0..8`).
   - **Player 1 (Human):** Starts at `(8, 4)` (bottom center) and aims to reach any cell on **row 0**.
   - **Player 2 (Computer):** Starts at `(0, 4)` (top center) and aims to reach any cell on **row 8**.
   - Each player begins with **10 walls**.
   - Human plays first, alternating one action per turn.

2. **Actions:**
   - **Move Pawn:** Move 1 orthogonal square (Up, Down, Left, Right) if not blocked by a wall or board edge.
   - **Jump Rules:**
     - When facing an adjacent opponent with no wall between:
       - **Straight Jump:** If the cell behind the opponent is on the board and not blocked by a wall, jump straight over the opponent.
       - **Diagonal Jump:** If (and only if) the straight jump is blocked by a wall or board boundary, the pawn may jump diagonally to either open side of the opponent. Diagonal jumps are prohibited when a straight jump is available.
   - **Place Wall:** Place a 2-unit long wall anchored at grid intersections `(row: 0..7, col: 0..7)` in either `horizontal` or `vertical` orientation.
     - Decrements active player's reserve by 1.
     - Cannot overlap existing walls of the same orientation.
     - Cannot cross perpendicularly at the exact same anchor point.
     - Endpoint touching (T-junctions and L-corners) is permitted.
     - **No-Trapping Rule:** A wall placement is strictly illegal if it closes off all routes to the goal for *either* player.

3. **Victory Condition:**
   - First pawn to step onto any square of its respective goal row wins immediately. Further moves are rejected.

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
│   │   ├── types.ts            # AI metrics, strategy types, agent configuration
│   │   ├── evaluation.ts       # State evaluation function & terminal utilities
│   │   ├── candidateActions.ts # Deterministic branching factor heuristic pruner
│   │   ├── greedyAgent.ts      # 1-ply greedy baseline agent
│   │   └── minimax.ts          # Minimax and Alpha-Beta search algorithms
│   ├── components/             # React visual presentation components
│   │   ├── Board.tsx           # Scalable interactive SVG board with highlights
│   │   ├── Panel.tsx           # Side panel: status, reserves, AI metrics, settings
│   │   └── Header.tsx          # Application header and objectives
│   ├── app/
│   │   └── App.tsx             # Main React application shell & game loop
│   ├── styles/
│   │   └── index.css           # High-contrast, responsive CSS styling
│   └── main.tsx                # React DOM entry point
├── tests/                      # Automated Vitest test suites
│   ├── setup.ts                # Test environment setup
│   ├── engine.test.ts          # State transitions, jumps, collisions, rules
│   ├── pathfinding.test.ts     # BFS vs A* equivalence, heuristics, mazes
│   ├── ai.test.ts              # Agent legality, equivalence, cutoffs, win detection
│   └── ui.test.tsx             # Component rendering, interaction, undo, reset
├── scripts/
│   └── benchmark.ts            # Reproducible tournament CLI with CSV/JSON output
├── reports/                    # Generated benchmark results
│   ├── benchmark_results.json
│   └── benchmark_summary.csv
└── docs/                       # Specifications and academic guides
    ├── IMPLEMENTATION_STATUS.md
    ├── COURSE_REPORT_GUIDE.md
    ├── RESEARCH_REFERENCES.md
    └── ...
```

---

## 4. AI Algorithms & Search Techniques

### A. Pathfinding: BFS vs. A*
- **BFS (Breadth-First Search):** Serves as the ground-truth exact solver on the unweighted 81-cell board graph.
- **A\* Search:** Production shortest-path solver utilizing Manhattan distance $h(n)$ to the closest square on the goal row:
  $$h(n) = |n.\text{row} - \text{goalRow}|$$
  - **Admissibility & Consistency:** Since pawns can only move orthogonally, each step alters vertical row displacement by at most 1. The minimum number of steps required to reach row 0 (or row 8) without walls is exactly $h(n)$. Walls can only lengthen the path, never shorten it; hence, $h(n)$ is strictly admissible ($h(n) \le h^*(n)$) and monotonic/consistent.
  - **Verification:** Unit tests confirm that BFS and A* compute identical shortest-path lengths across empty boards, handcrafted wall labyrinths, and 20 pseudo-random seeded boards.

### B. Heuristic Evaluation Function
Evaluates non-terminal board positions from the perspective of the searching agent:
$$\text{Score} = 100 \times (\text{dist}_{\text{opponent}} - \text{dist}_{\text{self}}) + 3 \times (\text{walls}_{\text{self}} - \text{walls}_{\text{opponent}})$$

Terminal state utilities incorporate a ply penalty to favor faster victories and delay inevitable defeats:
- **Terminal Win:** $+100{,}000 - \text{plyFromRoot}$
- **Terminal Loss:** $-100{,}000 + \text{plyFromRoot}$

### C. Managing Quoridor's Branching Factor
With up to 128 wall placements and 4+ pawn moves, the raw branching factor is $b \approx 132$, creating over $17{,}000$ branches at depth 2 and over $2{,}000{,}000$ at depth 3.
To maintain responsive play, `src/ai/candidateActions.ts` applies a deterministic priority heuristic:
1. Always includes **all legal pawn moves** (sorted with goal-advancing moves first).
2. Scores wall placements using:
   - Blocking edges on the opponent's current shortest path ($+60$ to $+90$).
   - Penalty for blocking own shortest path ($-35$).
   - Proximity to pawns and continuation of existing walls.
3. Selects the top legal candidates (default: 8 at root, 6 at sub-nodes) using full legality validation (including path preservation).
4. Both Minimax and Alpha-Beta receive the **exact same deterministic candidate tree and move ordering**.

### D. Minimax and Alpha-Beta Pruning
- **Minimax:** Exhaustive depth-limited tree search alternating between maximizing (computer) and minimizing (human) plies.
- **Alpha-Beta Pruning:** Maintains $[\alpha, \beta]$ bounds to prune branches that cannot influence the final decision.
- **Equivalence:** Because move generation and candidate sorting are identical, Alpha-Beta is mathematically guaranteed to choose the identical action and score as Minimax over that candidate tree, while evaluating substantially fewer nodes.

---

## 5. Benchmark Results

From actual execution (`npm run benchmark -- --games 2` with side rotation):

```text
=== Benchmark Summary Table ===
Matchup 1: Greedy (d1) vs Minimax (d2)
  - Greedy Wins: 0 (0.0%) | Minimax Wins: 4 (100.0%)
  - Mean Decision Time: Greedy 0.99ms | Minimax 4.44ms
  - Mean Nodes Visited: Greedy 13 | Minimax 81
  - Mean Cutoffs: 0

Matchup 2: Greedy (d1) vs Alpha-Beta (d2)
  - Greedy Wins: 0 (0.0%) | Alpha-Beta Wins: 4 (100.0%)
  - Mean Decision Time: Greedy 0.68ms | Alpha-Beta 2.41ms
  - Mean Nodes Visited: Greedy 13 | Alpha-Beta 30 (63% node reduction vs Minimax)
  - Mean Cutoffs: 8.33 per turn

Matchup 3: Minimax (d2) vs Alpha-Beta (d2)
  - Minimax Wins: 2 (50.0%) | Alpha-Beta Wins: 2 (50.0%)
  - Mean Decision Time: Minimax 2.46ms | Alpha-Beta 1.68ms
  - Mean Nodes Visited: Minimax 47 | Alpha-Beta 26 (45% reduction)
  - Mean Cutoffs: 5.18 per turn
```

The benchmark results confirm:
1. Adversarial lookahead decisively outperforms one-step heuristic evaluation.
2. Alpha-Beta achieves identical playing outcomes with $45\%$ to $63\%$ fewer node evaluations.

---

## 6. Manual Smoke-Test Walkthrough

1. Run `npm run dev` and open the app in your browser.
2. **Move Pawn:** Click a highlighted square (e.g. square above your pawn). Observe your pawn move and the AI respond with its search metrics displayed in the side panel.
3. **Horizontal Wall:** Click "Horizontal Wall", hover over an anchor to preview the wall in green, then click to place. Observe the wall render and your wall reserve decrement by 1.
4. **Vertical Wall:** Switch to "Vertical Wall" and place a vertical barrier.
5. **Collision Protection:** Attempt to place an overlapping or perpendicular crossing wall; observe the error feedback without turn loss.
6. **AI Configuration:** Change strategy to "Minimax (Unpruned)" or change depth to 1 or 3. Observe metrics adjust on subsequent turns.
7. **Undo:** Click "Undo Turn" to revert your move and the AI response.
8. **New Game:** Click "New Game" to reset the board, reserves, and statistics.

---

## 7. Known Limitations & Future Work

- **Candidate Approximation:** The candidate wall generator prunes the 128 raw wall anchors down to the top strategic candidates. Minimax and Alpha-Beta are equivalent over this candidate set, but this remains a heuristic approximation of the full 128-branch game tree.
- **MCTS (Monte Carlo Tree Search):** As outlined in project specifications, MCTS with UCT (Upper Confidence bounds applied to Trees) and shortest-path rollout policies is documented as potential future research.
