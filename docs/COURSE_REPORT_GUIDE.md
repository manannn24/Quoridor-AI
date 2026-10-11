# AI Course Report and Viva Guide

Use this as a report outline after the implementation is working. Replace placeholders with actual project details and measured results. Do not report expected performance as measured performance.

## Suggested report structure

1. **Abstract** — problem, implemented methods, and key measured findings.
2. **Introduction and motivation** — Quoridor as an adversarial planning problem with movement and wall-placement actions.
3. **Problem formulation**
   - Initial state
   - State representation
   - Legal actions
   - Transition model
   - Goal/terminal test
   - Utility or evaluation function
4. **Game engine and constraints** — movement, jumps, walls, no-path-blocking rule, terminal state.
5. **Pathfinding** — BFS reference solver and A* with Manhattan heuristic; explain why the heuristic is admissible.
6. **Greedy baseline** — one-step heuristic decisions and known limitations.
7. **Adversarial search** — Minimax, maximizing/minimizing layers, depth/ply, terminal utilities.
8. **Alpha-Beta pruning** — alpha/beta bounds, cutoffs, and why result equivalence is expected for the same search tree/order.
9. **Branching-factor control** — candidate-wall heuristic, why the full wall space is large, and the approximation introduced by candidate pruning.
10. **Implementation and UI** — architecture, tools, major modules.
11. **Testing** — rules tests, pathfinding comparisons, AI consistency, UI tests.
12. **Experimental methodology** — how many games, which sides/strategies/depths, deterministic seeds, metrics, and environment.
13. **Results** — tables/graphs generated from actual benchmark output.
14. **Discussion** — measured trade-offs in win rate, decision time, nodes visited and cutoffs; do not claim a stronger agent on too few games.
15. **Limitations and future work** — candidate-wall approximation, evaluation weights, shallow search, and a possible MCTS extension.
16. **Conclusion**.
17. **References**.

## Recommended experiments

### Experiment 1 — Minimax vs Alpha-Beta

At the same search depth and candidate-action settings, compare nodes visited, cutoffs, and decision time on identical fixed states. Confirm that the chosen action/value matches.

### Experiment 2 — Search depth

Run depth 1, 2 and 3 where it is practical. Compare mean decision time and nodes visited. Note if the completed depth is capped for responsiveness.

### Experiment 3 — Agent matchups

Compare Greedy vs Minimax and Greedy vs Alpha-Beta, rotating starting sides. A small number of games is useful as a smoke test but is not enough to claim statistically reliable superiority.

### Experiment 4 — Heuristic ablation (optional)

Compare distance-only evaluation against distance + remaining-wall reserve, using the same benchmarks and seeds. State the exact formula for each version.

## Measured result table

From `reports/benchmark_results.json` (4 games per matchup with side rotation, seed 42):

| Strategy | Games | Wins | Losses | Win rate | Mean decision time | Mean nodes | Mean cutoffs |
|---|---:|---:|---:|---:|---:|---:|---:|
| Greedy (d1) vs Minimax (d2) | 4 | 0 | 4 | 0.0% | 0.99 ms | 13 | 0.00 |
| Minimax (d2) vs Greedy (d1) | 4 | 4 | 0 | 100.0% | 4.44 ms | 81 | 0.00 |
| Greedy (d1) vs Alpha-Beta (d2) | 4 | 0 | 4 | 0.0% | 0.68 ms | 13 | 0.00 |
| Alpha-Beta (d2) vs Greedy (d1) | 4 | 4 | 0 | 100.0% | 2.41 ms | 30 | 8.33 |
| Minimax (d2) vs Alpha-Beta (d2) | 4 | 2 | 2 | 50.0% | 2.46 ms | 47 | 0.00 |
| Alpha-Beta (d2) vs Minimax (d2) | 4 | 2 | 2 | 50.0% | 1.68 ms | 26 | 5.18 |


## Likely viva questions

- How is Quoridor represented as a state-space search problem?
- Why is the game adversarial rather than a single-agent pathfinding problem?
- What is the difference between the pawn-pathfinding problem and the game-decision problem?
- Why is BFS optimal on this unweighted graph?
- Why is Manhattan distance admissible for A* despite the walls?
- What makes Minimax alternate between maximizing and minimizing layers?
- What do alpha and beta represent, and when is a branch pruned?
- Under what conditions does Alpha-Beta return the same result as Minimax?
- Why do walls create a large branching factor?
- What is lost when the search uses a candidate-wall heuristic instead of all legal walls?
- Why must wall legality preserve at least one path for each player?
- How did you validate jump and diagonal-jump edge cases?
- Which benchmark measurements support your conclusions, and what are their limitations?
- How could MCTS fit as future work, and why is rollout policy important in Quoridor?

## Explain the two levels of reasoning clearly

Pathfinding asks: **“What is the shortest route through the current wall layout?”**

Adversarial search asks: **“Given that the opponent will respond, which action gives me the best future position?”**

A* does not replace Minimax; it supplies useful distance information for the evaluation function.
