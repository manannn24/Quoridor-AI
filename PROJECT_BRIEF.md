# Project Brief — Intelligent Quoridor

## 1. Project title

**Intelligent Quoridor: Pathfinding and Adversarial Search for a Board-Game AI**

## 2. Problem statement

Build a polished 2-player Quoridor game in which a human plays against a computer agent. The computer must make strategic choices using search and heuristics rather than relying only on fixed if/else rules. The project should visibly demonstrate AI ideas from the Artificial Intelligence course: problem formulation, BFS/A* pathfinding, heuristic evaluation, adversarial search, Minimax, and Alpha-Beta pruning.

## 3. Primary goals

1. Implement standard 2-player Quoridor rules correctly.
2. Separate game rules, pathfinding, AI search, and UI into maintainable modules.
3. Provide a usable, responsive browser UI for a human-vs-computer match.
4. Include three selectable AI strategies for demonstration and comparison:
   - Greedy heuristic baseline
   - Minimax without pruning
   - Minimax with Alpha-Beta pruning
5. Track AI decision metrics and provide reproducible benchmark runs.
6. Include automated tests, clear documentation, and a course-report guide.

## 4. Non-goals for version 1

- Do not implement 4-player Quoridor.
- Do not implement online multiplayer, accounts, backend, cloud services, or persistence.
- Do not add machine learning, neural networks, or reinforcement-learning training.
- Do not implement MCTS in v1. MCTS is a documented potential extension and research reference.
- Do not clone the referenced MCTS repository or copy its source code.
- Do not attempt to implement every algorithm in the syllabus merely to include it. Implement the ones that naturally fit the game.

## 5. Required AI concepts

- **Problem formulation:** states, actions, transition model, goal test, terminal states.
- **BFS:** reference/exact shortest-path solver for the unweighted cell graph.
- **A* search:** production shortest-path distance calculation using Manhattan distance as an admissible heuristic on the wall-constrained cell graph.
- **Heuristic evaluation:** quantify path advantage and remaining wall resources.
- **Minimax:** adversarial look-ahead between two competing players.
- **Alpha-Beta pruning:** reduce explored nodes while preserving Minimax's result for the same generated action tree and move ordering.

## 6. Technology and architecture

Use React + TypeScript + Vite. Put the rules engine and AI in pure TypeScript modules with no React dependency. Use Vitest for tests and a TypeScript CLI script for benchmark experiments. Keep the application client-side and self-contained.

Suggested source layout (the agent may improve it if the separation remains clear):

```text
src/
  app/
  components/
  game/
    types.ts
    state.ts
    movement.ts
    walls.ts
    actions.ts
    pathfinding.ts
  ai/
    evaluation.ts
    candidateActions.ts
    greedyAgent.ts
    minimax.ts
    types.ts
  styles/
tests/
scripts/
docs/
```

## 7. Deliverable expectations

- Playable web app
- Human-vs-AI full game flow
- Accurate rule enforcement and illegal-action feedback
- Three AI strategies
- Search statistics panel
- Unit/integration tests
- Benchmark command with summary output
- README with setup, controls, architecture, algorithms, limitations, and commands
- Course report guide with actual measured results kept separate from expected results
- Implementation status/audit log

## 8. Project quality principles

Correctness before strength; readable code before clever shortcuts; deterministic tests; no fabricated experimental claims; no hidden external dependency; accessible controls; clean responsive UI; and accurate documentation of any limitations.
