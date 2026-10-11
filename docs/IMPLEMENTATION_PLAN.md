# Implementation Plan and Engineering Guardrails

The phases below are an internal order of work. In the one-shot run, complete every phase without pausing to ask for approval between them.

## Phase A — inspect and establish the project

- Inspect the workspace and Git status before changing files.
- Preserve any pre-existing user work. Do not reset, clean, force-push, or overwrite unrelated files.
- If there is no relevant app, scaffold React + TypeScript + Vite.
- Confirm scripts, dependencies, and developer commands.

## Phase B — rules engine first

- Define types and initial state.
- Implement wall-edge geometry, pawn movement/jump logic, wall legality and path preservation.
- Implement state transitions and terminal-state rules.
- Implement BFS and A*.
- Write and run engine/pathfinding tests before styling the UI.

## Phase C — AI engine

- Implement shared evaluation and deterministic candidate-action generation.
- Implement Greedy baseline.
- Implement Minimax and Alpha-Beta over the same generated action tree.
- Collect metrics and test consistency/legal actions.
- Add a small reproducible benchmark script; execute a smoke benchmark.

## Phase D — UI integration

- Build the board and interactive cells/wall anchors.
- Implement human controls, validation errors, AI thinking state, strategy/depth controls, metrics, New Game and Undo.
- Keep UI state separate from search state.
- Add component/integration tests.

## Phase E — audit, documentation and polish

- Run all checks, fix failures and repeat.
- Run benchmark and report actual output.
- Review accessibility, responsive layout, wall rendering/hit targets, game reset and terminal state.
- Update README and `docs/IMPLEMENTATION_STATUS.md` with commands actually executed and their actual outcomes.

## Engineering guardrails

- Prefer a small number of well-separated modules over a monolithic component.
- Keep game engine and AI functions pure where practical.
- Never mutate a shared state object used by another search branch.
- Do not trust UI highlighting as the only legality check; validate every applied user action.
- Do not bypass path preservation when generating candidate walls.
- Do not use randomness in Minimax action ordering. If benchmark match selection uses randomness, seed it.
- Do not fake game result data or assert strength without measurements.
- Do not add MCTS, a neural network, a backend, or unrelated features to v1.
- If a dependency or environment issue blocks a check, record the exact command/error, fix what is in scope, and continue with remaining checks.
