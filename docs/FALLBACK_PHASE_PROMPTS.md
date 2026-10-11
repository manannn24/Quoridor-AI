# Fallback Prompts (Use Only If One-Shot Execution Stalls)

The normal path is to use `ANTIGRAVITY_MASTER_PROMPT.md` once. These prompts are recovery options if Antigravity hits context limits or leaves an incomplete implementation. Do not start over or overwrite working code; inspect the current workspace and continue from it.

## Phase 1 — Engine and tests

Read `PROJECT_BRIEF.md`, `docs/GAME_RULES_AND_STATE.md`, `docs/AI_DESIGN.md`, `docs/TESTING_AND_ACCEPTANCE.md`, and `docs/IMPLEMENTATION_PLAN.md`. Inspect the current workspace/Git status and preserve existing work. Implement or finish the pure TypeScript Quoridor engine: types/state, normal pawn moves, straight and diagonal jumps, wall geometry/overlap/crossing, wall legality with path preservation, turns/win state, BFS, A*. Add and run engine/pathfinding tests, fix failures, and update `docs/IMPLEMENTATION_STATUS.md`. Do not build UI yet. Do not stop after planning; implement and test this phase.

## Phase 2 — AI and benchmarks

Read `docs/AI_DESIGN.md`, `docs/TESTING_AND_ACCEPTANCE.md`, and the current implementation/status. Preserve and reuse the working engine. Implement Greedy, Minimax, Alpha-Beta, deterministic candidate-wall filtering, evaluation metrics, and a small seeded benchmark CLI. Add tests for legal actions, winning moves, Minimax/Alpha-Beta equivalence and pruning metrics. Run the tests and a smoke benchmark; fix failures. Update the status log with actual results. Do not implement MCTS.

## Phase 3 — UI and final audit

Read `docs/PRODUCT_SPEC.md`, `docs/TESTING_AND_ACCEPTANCE.md`, and all relevant source/docs. Build or finish the responsive React UI for human-vs-AI, pawn/wall interactions, status/error messages, strategy/depth controls, metrics, reset and undo. Add UI tests, finish README/report docs, run `npm run check:all`, run a smoke benchmark, and address all failures. Record commands and real outputs in `docs/IMPLEMENTATION_STATUS.md`. Do not claim completion if required checks have not been run or if core rules are knowingly incorrect.
