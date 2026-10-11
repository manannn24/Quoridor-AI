# AI Design

## 1. Overview

Version 1 contains three agents, all using one shared rules engine:

1. Greedy heuristic baseline.
2. Minimax without pruning.
3. Minimax with Alpha-Beta pruning.

The default agent is Minimax + Alpha-Beta. Both search-based agents must use the same deterministic candidate-action generator, move ordering, evaluation function, and depth settings so their results can be compared fairly. Their only intentional algorithmic difference is pruning.

## 2. Pathfinding: BFS and A*

### Graph

- Each of the 81 cells is a node.
- Edges connect orthogonally adjacent cells when no wall blocks movement between them.
- For distance evaluation, ignore the opponent pawn as a permanent obstacle.

### BFS

Implement exact BFS as a simple reference solver for this unweighted graph. Return shortest distance and preferably a shortest path.

### A*

Implement A* for shortest-path distance/path. Use Manhattan distance to the closest goal-row cell as `h(n)`. It is admissible and consistent for orthogonal movement; walls remove edges but do not reduce the minimum required vertical displacement.

- Compare A* path length against BFS in tests over initial and constructed legal states.
- Keep pathfinding deterministic.
- Handle no-route states defensively, although valid game states and wall-placement validation should prevent them.

## 3. Evaluation function

All evaluation values must be from a clearly documented perspective (preferably the root/searching player for Minimax, or the player-to-move for negamax; choose one approach and use it consistently).

A reasonable initial evaluation is:

```text
score = 100 × (opponentShortestPath - ownShortestPath)
      + 3 × (ownWallsRemaining - opponentWallsRemaining)
```

Suggested terminal values:

- Win for the evaluating side: `+100000 - plyFromRoot`.
- Loss for the evaluating side: `-100000 + plyFromRoot`.

This makes the agent prefer faster wins and delay unavoidable losses. Values are tunable parameters, not scientific truths; put them in one named configuration object and document them. Avoid evaluating terminal states as ordinary nonterminal states.

You may add a small mobility term only if it is inexpensive, consistently calculated, documented, and tested. Start with the simple formula above before adding complexity.

## 4. Greedy heuristic baseline

At each turn:

1. Generate legal pawn actions and a pruned list of strategically plausible legal wall actions.
2. Apply each action to a copied state.
3. Score the resulting state using the evaluation function.
4. Choose the action with the best score for the acting player.

A simple baseline is intentionally less strategic than Minimax. It should still take immediate wins, avoid immediate losses when that is visible in its one-step evaluation, preserve legal paths, and use walls only when the resulting evaluation improves.

## 5. Minimax

- Search alternating player actions to a configurable depth of 1, 2, or 3 plies.
- Detect terminal wins/losses at every node.
- The root side maximizes its score; the opposing side minimizes it (or implement a correct equivalent negamax formulation).
- Use the same action set and ordering as Alpha-Beta for the same state and depth.
- Use deterministic tie-breaking so identical positions produce identical choices.
- Collect `nodesVisited`, `leavesEvaluated`, `completedDepth`, and `elapsedMs`.

Depth means number of individual actions (plies), not complete human+computer turns.

## 6. Alpha-Beta pruning

- Implement alpha and beta bounds correctly around the same Minimax recursion.
- Track the number of cutoffs.
- At a fixed state, depth, deterministic action ordering, and candidate generator, plain Minimax and Alpha-Beta must return the same root value and chosen action (except only if an explicitly documented tie policy permits equivalent tied actions; preferably ensure the same action).
- Do not claim Alpha-Beta preserves the result of *full* Minimax when action generation itself prunes walls. It preserves the result for the generated candidate tree.

## 7. Managing Quoridor's branching factor

There are up to 128 raw wall anchors (64 positions × 2 orientations), in addition to pawn moves. Searching all wall actions at every node is expensive. Use a clearly named, deterministic candidate-wall heuristic for search, but preserve complete legality validation.

Candidate priorities should consider a combination of:

- Whether the wall would block an edge on the opponent's current shortest path (high priority).
- Whether it interacts with the current player's shortest path (use care not to needlessly slow yourself).
- Proximity to either pawn.
- Proximity/continuation of existing wall segments.
- Board edges where an extension can create a meaningful detour.

Practical constraints:

- Include all legal pawn moves.
- Use small configurable wall-candidate limits (e.g., 10–12 at root and 6–8 at deeper plies) and tune only after measuring responsiveness.
- If the initially prioritized candidates are illegal, continue scanning lower-ranked candidates until the requested number of legal wall candidates is found or all candidates are exhausted.
- The heuristic must never bypass the full wall-validity rules, especially the no-trapping rule.
- Candidate generation and tie-breaking must be deterministic.
- Keep the complete legal-action validator separate from candidate selection.

This is an approximation: the search is exact only over the generated candidate tree. State this limitation in the UI documentation/report guide.

## 8. Performance safeguards

- Default depth 2; permit up to depth 3 where the selected agent remains responsive.
- Cap work through depth/candidate limits rather than letting the main thread freeze indefinitely.
- If necessary, move AI computation to a Web Worker, but only if it remains reliable and testable. Do not add a worker merely for architecture's sake.
- The AI must always return a legal action for every nonterminal valid state with available legal actions.
- If one strategy reaches a safety limit, make the limitation visible rather than returning an illegal or stale move.

## 9. Metrics

At minimum record:

- Agent name/strategy.
- Requested and completed depth.
- Nodes visited.
- Leaves evaluated.
- Alpha-Beta cutoffs (zero for plain Minimax and Greedy).
- Elapsed decision time in milliseconds.
- Selected action and score.

## 10. Benchmarking

Create a reproducible CLI benchmark that runs agents against each other. It should:

- Accept a configurable game count, deterministic seed, and optionally strategy/depth.
- Rotate which side each strategy plays to reduce first-player bias.
- Record wins, losses, draws/aborts if applicable, average decision time, mean nodes visited, average cutoffs, and game lengths.
- Avoid an endless run; use a modest default (e.g., 4 games per pairing) and allow the user to increase it.
- Print a concise summary and write machine-readable JSON or CSV under a reports/ directory or a user-provided output path.
- Label benchmark results as measurements from the actual run; never hard-code hypothetical win rates.

## 11. MCTS extension — explicitly out of scope for v1

MCTS could be added later with Selection, Expansion, Simulation/Rollout, and Backpropagation, along with Quoridor-specific rollout heuristics. The reference repository explains why pure random rollout is weak in Quoridor and describes candidate-wall filtering and shortest-path-biased rollouts. Do not implement MCTS unless the student explicitly starts a later extension phase. Do not copy its source code.
