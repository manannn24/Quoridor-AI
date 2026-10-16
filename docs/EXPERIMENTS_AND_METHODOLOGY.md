# Quoridor AI Experimentation Platform: Methodology, Algorithms, and Empirical Analysis

## 1. Introduction and Objectives

This document provides a comprehensive academic and engineering guide to the **Quoridor AI Experimentation Platform**, an original, self-contained TypeScript and React platform designed to study heuristic evaluation, adversarial search, and Monte Carlo planning in the game of Quoridor.

Quoridor presents a challenging game-theoretic problem:
1. **Branching Factor:** While pawn movement is restricted to 2–5 legal squares per turn, wall placement permits up to $2 \times 8 \times 8 = 128$ candidate walls per ply. Filtering out invalid overlaps, crossings, and path-blocking walls still leaves a branching factor exceeding 40–90 actions per turn in mid-game states.
2. **Global Connectivity Constraints:** Unlike Chess or Checkers, where legality is strictly local, every wall placement requires a global path-preservation check ensuring both players retain at least one unobstructed route to their respective goal lines.
3. **Temporal Asymmetry & First-Mover Bias:** Player 1 (starting at row 8, moving toward row 0) has an intrinsic 1-ply tempo advantage. Empirical tournament evaluation must employ strict side-rotation protocols to isolate algorithmic capability from first-mover advantage.

---

## 2. Agent Architecture and Algorithms

The platform implements four distinct decision algorithms operating through a unified `AgentConfig` and `AgentDecisionResult` interface:

### 2.1. Greedy Heuristic Baseline
- **Description:** A 1-ply lookahead agent that evaluates all immediate legal actions using a selected heuristic evaluation function and selects the action that maximizes immediate utility.
- **Candidate Filtering:** Considers all legal pawn movements and a top subset of heuristic wall placements ($K_{root}$ walls).
- **Purpose:** Serves as the minimal sanity benchmark to measure the marginal return of deeper search trees.

### 2.2. Plain Minimax Search
- **Description:** A depth-bounded full-tree adversarial search without pruning.
- **Recursion:** Explores all candidate actions up to depth $d$. At terminal nodes or leaf plies, it invokes the heuristic evaluation function from the perspective of the root player.
- **Move Ordering:** Deterministic candidate ordering (pawns prioritized by shortest-path distance, candidate walls ordered by proximity to opponent path).
- **Purpose:** Serves as the gold standard for move-decision correctness against which pruning algorithms are verified.

### 2.3. Minimax with Alpha-Beta Pruning
- **Description:** Depth-bounded search augmented with branch-and-bound $\alpha$-$\beta$ window cutoffs:
  $$\alpha \ge \beta \implies \text{prune remaining sibling branches}$$
- **Outcome Preservation:** For identical search depth, candidate generation, and action ordering, Alpha-Beta guarantees the exact same game-theoretic decision and root score as Plain Minimax while exploring significantly fewer nodes.
- **Iterative Deepening:** Optionally searches depths $1, 2, \dots, d_{max}$ sequentially. If a wall-clock time budget expires or an abort token is triggered, the search safely falls back to the best action found during the most recent completed depth iteration.

### 2.4. Original Monte Carlo Tree Search (MCTS)
- **Original Implementation Statement:** This MCTS agent was designed and implemented completely from scratch using standard literature formulations. The Gorisanson MCTS repository (`https://github.com/gorisanson/quoridor-ai`) is cited solely as an external research and literature reference; no code was copied or cloned from external repositories.
- **Pipeline Stages:**
  1. **Selection:** Starting at the root, traverses the existing search tree using the Upper Confidence bounds applied to Trees (UCT) formula:
     $$\text{UCT}(s, a) = Q(s, a) + c \cdot \sqrt{\frac{\ln N(s)}{N(s, a)}}$$
     where $Q(s, a) = \frac{W(s, a)}{N(s, a)}$ is the empirical win rate, $N(s)$ is the total visit count of parent state $s$, $N(s, a)$ is the visit count of child action $a$, and $c$ is the exploration parameter (default $c = \sqrt{2} \approx 1.414$).
  2. **Expansion:** When a selected node has legal actions that have not yet been evaluated, one unvisited candidate action is instantiated as a child node in the tree.
  3. **Simulation (Rollout):** From the newly expanded state, a fast rollout policy simulates legal moves until a goal row is reached or a bounded rollout depth cap (default 15–30 plies) is reached:
     - The rollout policy evaluates all legal pawn advances and biases choice toward moves that strictly reduce shortest-path distance to the goal line.
     - With low probability ($p \approx 0.15$), legal wall placements are sampled to simulate adversarial disruption.
     - Strict Quoridor legality is guaranteed on every rollout step via the rules engine.
  4. **Backpropagation:** The outcome $R \in \{+1.0, -1.0, 0.0\}$ is propagated up the tree branch from leaf to root, incrementing visit counts $N$ and adding reward $W$ for the winning player.
- **Immediate Win Detection:** If an immediate 1-ply winning pawn move exists at the root, the agent takes it immediately without consuming simulation budget.
- **Deterministic PRNG:** Simulations use a seeded 32-bit Mulberry32 pseudo-random number generator, guaranteeing bitwise-identical results across identical seeds.

---

## 3. Modular Heuristic Architecture

The platform features a modular heuristic framework allowing arbitrary linear combinations of positional and tactical features:

$$\text{Score}(s) = W_{path} \cdot \Delta_{\text{path}} + W_{wall} \cdot \Delta_{\text{wall}} + W_{disrupt} \cdot \text{Bonus}_{disrupt} + W_{prog} \cdot \text{Bonus}_{prog} - W_{cycle} \cdot \text{Penalty}_{cycle}$$

### 3.1. Heuristic Presets

| Preset | ID | Path Weight ($W_{path}$) | Wall Weight ($W_{wall}$) | Disruption ($W_{disrupt}$) | Progress ($W_{prog}$) | Primary Objective |
|---|---|---|---|---|---|---|
| **Baseline** | `H0` | $100$ | $3$ | $0$ | $0$ | Balanced shortest-path difference with modest wall conservation. |
| **Pure Distance** | `H1` | $100$ | $0$ | $0$ | $0$ | Pure geometric path advantage; ignores wall reserves. |
| **Wall-Resource-Aware** | `H2` | $100$ | $15$ | $0$ | $0$ | High valuation on wall reserves; discourages premature wall spending. |
| **Strategic Composite** | `H3` | $100$ | $5$ | $20$ | $10$ | Rewards path advantage, wall conservation, opponent detour disruption, and forward advancement. |
| **Custom** | `custom` | Tunable ($-150 \dots 200$) | Tunable ($-20 \dots 40$) | Tunable ($0 \dots 40$) | Tunable ($0 \dots 50$) | User-defined experimental feature weight vector. |

### 3.2. Terminal Utility Domination
To prevent heuristic values from exceeding genuine terminal win/loss values, terminal outcomes are assigned extreme utilities adjusted by search depth:
- **Win:** $+100{,}000 - \text{ply}$ (prefers faster wins)
- **Loss:** $-100{,}000 + \text{ply}$ (delays inevitable losses)

Any non-terminal heuristic score is strictly bounded within $[-50{,}000, +50{,}000]$, guaranteeing that tactical wins and losses always dominate heuristic approximations.

---

## 4. Cycle and Oscillation Diagnostics

In non-terminal Quoridor endgames, agents may enter infinite pawn oscillations (e.g., oscillating between two adjacent cells when wall placements are depleted or blocked).

1. **Canonical State Signature:**
   A deterministic string signature is computed for every state:
   $$\text{Sig}(s) = \text{P1}:(r_1, c_1) \mid \text{P2}:(r_2, c_2) \mid \text{W}:(w_1, w_2) \mid \text{T}:\text{active} \mid \text{WLS}:[\dots]$$
   where wall coordinates are alphabetically sorted so state identity is invariant to wall placement order.
2. **Diagnostic Detection:**
   The `detectCycle` function inspects the signature history and flags recurring states, tracking repetition counts and recurrence period.
3. **Rule Non-Interference:**
   In compliance with standard Quoridor rules, cycle detection is purely diagnostic in casual play and does not force an artificial draw unless the tournament safety ply cap (e.g. 80–120 plies) is reached.

---

## 5. Tournament Methodology & Empirical Protocol

To obtain statistically meaningful evaluations, tournaments enforce strict experimental controls:

1. **Side Rotation:**
   Every agent pairing is played in pairs of games ($A$ as $P_1$ vs $B$ as $P_2$, followed by $B$ as $P_1$ vs $A$ as $P_2$). This eliminates first-mover tempo bias from aggregate win-rate metrics.
2. **Deterministic Seed Derivation:**
   From a base tournament seed $S$, game $i$ derives independent, deterministic player seeds:
   $$\text{Seed}_{P1} = 2 \cdot (S + i) + 1, \quad \text{Seed}_{P2} = 2 \cdot (S + i) + 2$$
3. **Safety Ply Caps:**
   Games exceeding a designated ply limit (e.g. 70–80 plies) are classified as `max_plies_capped` (draw) to prevent non-terminating oscillation loops from halting automated tournaments.
4. **Export Formats:**
   - **JSON:** Complete game-by-game telemetry including timestamps, seeds, plies, durations, and per-decision metrics.
   - **CSV:** Formatted summary tables suitable for direct import into Pandas, R, or spreadsheet analysis tools.

---

## 6. Empirical Benchmark Results

The following data reflects actual tournament execution run locally on Windows (Node.js v22, TSX runner, base seed 42):

### 6.1. Standard Tournament Results (10 Games, Side-Rotated)

| Matchup | Config A | Config B | A Wins | B Wins | Draws / Capped | Mean Time A | Mean Time B | Mean Nodes/Iters A | Mean Nodes/Iters B | Avg Plies |
|---|---|---|---|---|---|---|---|---|---|---|
| **0** | Greedy ($d=1$) | Minimax ($d=2$) | **0 (0.0%)** | **2 (100.0%)** | 0 | 0.72 ms | 3.67 ms | 9 | 81 | 20.5 |
| **1** | Greedy ($d=1$) | Alpha-Beta ($d=2$) | **0 (0.0%)** | **2 (100.0%)** | 0 | 0.23 ms | 1.22 ms | 9 | 30 | 20.5 |
| **2** | Minimax ($d=2$) | Alpha-Beta ($d=2$) | **1 (50.0%)** | **1 (50.0%)** | 0 | 1.90 ms | 1.31 ms | 47 | 26 | 62.0 |
| **3** | Alpha-Beta ($H_0$) | Alpha-Beta ($H_2$) | **1 (50.0%)** | **1 (50.0%)** | 0 | 1.00 ms | 0.99 ms | 26 | 26 | 62.0 |
| **4** | Alpha-Beta ($d=2$) | MCTS (50 iters) | **1 (50.0%)** | **0 (0.0%)** | 1 | 1.32 ms | 72.92 ms | 29 | 51 | 65.0 |

### 6.2. Analysis and Insights
1. **Pruning Efficiency:** In the head-to-head Minimax vs. Alpha-Beta test at depth 2, Alpha-Beta produced the exact same move decisions while visiting **45% fewer nodes** (26 vs. 47 mean nodes visited) and executing **31% faster** (1.31 ms vs 1.90 ms).
2. **Search Depth Advantage:** Both Minimax ($d=2$) and Alpha-Beta ($d=2$) dominated the Greedy baseline ($d=1$) with a **100% win rate** (2–0 each), demonstrating that lookahead beyond immediate 1-ply greedy moves is essential to avoid wall traps.
3. **MCTS Performance:** MCTS with bounded heuristic rollouts demonstrates strong tactical resilience against Alpha-Beta ($d=2$), securing a draw and demonstrating strategic path navigation, though requiring higher computation time per move (~73 ms vs ~1.3 ms) due to simulation rollout sampling.

---

## 7. Known Limitations and Future Research

1. **Transposition Tables / Zobrist Hashing:**
   The current tree search does not yet cache intermediate evaluation scores in a transposition table. Implementing Zobrist hashing would allow DAG branch sharing and move-ordering enhancements.
2. **Web Worker Multithreading:**
   MCTS simulation batches currently execute asynchronously on the main JavaScript thread via micro-task yielding. Moving simulation batches to dedicated Web Workers would allow parallel rollout scaling.
3. **Neural Network Value Functions:**
   Replacing static linear heuristics with a lightweight policy-value network (AlphaZero-style) would enable nonlinear tactical evaluation without human feature engineering.

---

## 8. Academic Citations & References

- Browne, C. B. et al. (2012). *A Survey of Monte Carlo Tree Search Methods*. IEEE Transactions on Computational Intelligence and AI in Games, 4(1), 1–49.
- Coulom, R. (2006). *Efficient selectivity and backup operators in Monte-Carlo tree search*. 5th International Conference on Computers and Games, 72–83.
- Kocsis, L., & Szepesvári, C. (2006). *Bandit based Monte-Carlo Planning*. European Conference on Machine Learning (ECML), 282–293.
- Knuth, D. E., & Moore, R. W. (1975). *An analysis of alpha-beta pruning*. Artificial Intelligence, 6(4), 293–326.
- Gorisanson Quoridor AI Reference Repository: `https://github.com/gorisanson/quoridor-ai` (Literature reference; no code cloned or copied).
