# Antigravity Master Prompt — Build the Complete Quoridor AI Project

You are the autonomous implementation agent for this project. Read **all Markdown specification files in this kit**, especially `PROJECT_BRIEF.md` and everything inside `docs/`, before coding. These documents are the source of truth. Then implement the project, test it, debug it, audit it, and update its documentation until it meets the acceptance criteria. **Do not stop after producing a plan, and do not ask me for approval between phases.** Work through all phases below in one continuous run if possible.

## Mission

Build an original, polished, fully playable browser game: **Quoridor — Human vs Computer**, demonstrating BFS, A*, heuristic evaluation, Minimax and Alpha-Beta pruning. Implement three selectable agents: Greedy heuristic, Minimax without pruning, and Minimax with Alpha-Beta. Include metrics and reproducible AI benchmarks. Use MCTS only as documented future work; it is not required for v1.

## First: inspect safely

1. Inspect the current workspace, existing files, package manager, runtime versions, and Git status before changing anything.
2. If a relevant project already exists, integrate with it carefully. Preserve unrelated user work and uncommitted changes. Never run destructive reset/clean commands, delete unknown files, or overwrite unrelated code.
3. If the workspace is empty, scaffold React + TypeScript + Vite.
4. Do not clone the Gorisanson MCTS repository, copy its implementation, or pretend its code is yours. Build the rules engine and AI originally from the written specifications. The repo is a research reference only.
5. Create/maintain `docs/IMPLEMENTATION_STATUS.md` with checkboxes, commands run, actual pass/fail results, and remaining limitations.

## Required implementation order

### A. Pure game engine

Implement the standard 2-player rule set from `docs/GAME_RULES_AND_STATE.md`. Include immutable/safe state transitions, correct pawn movement and jump/diagonal-jump rules, horizontal/vertical wall geometry, overlap/crossing checks, path-preservation validation, wall reserves, turn switching, win detection, and rejection of actions after game end. The engine must be testable without React or a browser.

Implement BFS as the reference shortest-path algorithm and A* as the production shortest-path solver using Manhattan distance. Compare their distances in tests across initial, crafted, and seeded legal states. The path model must respect wall-blocked edges and use every cell on the relevant goal row as a goal. It should ignore the other pawn as a permanent path obstruction for distance estimation.

Do not rely on the UI to enforce rules. Every user-submitted action must be validated by the engine. Candidate AI wall actions must use the same full legality checks, including the rule that every player retains a route to their goal.

### B. AI agents

Implement all three strategies in `docs/AI_DESIGN.md`:

1. **Greedy heuristic baseline** — one-step state evaluation over all legal pawn moves and a small set of candidate walls.
2. **Minimax** — configurable depth 1–3, terminal-state handling, deterministic move ordering/tie-breaking, and node/leaf/time metrics.
3. **Minimax + Alpha-Beta** — the same evaluation, depth, action candidate generator, and ordering as plain Minimax, but with alpha-beta cutoffs.

Use a clearly documented evaluation function initially equivalent to:

`score = 100 * (opponentShortestPath - ownShortestPath) + 3 * (ownWallsRemaining - opponentWallsRemaining)`

Use large terminal utilities (for example ±100000 adjusted by ply) so wins are preferred and losses delayed. Keep values in named configuration constants so they can be adjusted later. Correctness and determinism matter more than maximizing playing strength immediately.

Quoridor has a large branching factor because of wall placement. Implement a deterministic, heuristic candidate-wall generator as described in `docs/AI_DESIGN.md`, considering shortest-path edges, pawn proximity, current walls, and board edges. Include every legal pawn action. For the same state/depth, Minimax and Alpha-Beta must traverse the same candidate-action tree and ordering. Be honest in the documentation that Alpha-Beta preserves Minimax's outcome for that generated tree, while wall-candidate pruning approximates the full game tree.

Track at least strategy, requested/completed depth, nodes visited, leaves evaluated, cutoffs, elapsed milliseconds, and selected action/score. Ensure each AI returns a fully legal action for nonterminal valid states.

### C. Benchmarking

Create a reproducible benchmark CLI (for example, `npm run benchmark`) that can run a small default number of games quickly, accept a seed/game-count option, rotate player sides, and output actual wins/losses/win rate, mean decision time, node counts, cutoffs, and game length. Emit JSON or CSV in a reports folder or an explicit output path. Use a deterministic seed for any randomized benchmark behavior. Do not hard-code or invent results. The normal `check:all` command must not launch a long tournament.

At minimum, benchmark Greedy against Minimax and Alpha-Beta with side rotation. Keep the output modest and readable. If runtime constraints appear, reduce default benchmark games—not test coverage or rules correctness.

### D. React UI

Implement the product experience in `docs/PRODUCT_SPEC.md`. The game must be fully playable, not a static mockup. It must include:

- A responsive, clearly visible 9×9 board and 2 differentiated pawns.
- Legal pawn destination highlights.
- Horizontal/vertical wall selection and valid anchor selection.
- Clear remaining-wall counts, current player, errors/status, and winner display.
- AI strategy selector (Greedy, Minimax, Minimax + Alpha-Beta), depth 1–3 where supported, and the primary Alpha-Beta default.
- An AI-thinking state that prevents double actions while search runs.
- Last decision metrics.
- New Game and usable Undo behavior.
- Accessible semantic controls, visible keyboard focus, clear contrast, and responsive styling.

Use local CSS/SVG/HTML only; do not rely on remote images/fonts/APIs. Keep the engine and AI independent from React. Never let a human action corrupt the board if invalid; show a useful short explanation and preserve state/turn/wall count.

### E. Tests and documentation

Use Vitest for automated tests. Add engine, pathfinding, AI and UI/integration tests according to `docs/TESTING_AND_ACCEPTANCE.md`. Add package scripts equivalent to:

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run benchmark`
- `npm run check:all`

`check:all` should run the relevant automated checks and production build without launching a long benchmark tournament.

Write a useful root README that covers installation, controls, game rules, architecture, algorithms, commands, test coverage, benchmark use, and limitations. Keep `docs/COURSE_REPORT_GUIDE.md` accurate and useful. Add citations/attribution in `docs/RESEARCH_REFERENCES.md`; do not report the reference repository's performance as this project's performance. MCTS remains future work for this version.

## Definition of done

Use `docs/TESTING_AND_ACCEPTANCE.md` as the detailed acceptance list. At a minimum:

- The game can be played to completion against the computer.
- Jump, diagonal jump, wall overlap/crossing, path preservation, wall count, and win rules are correct and tested.
- BFS and A* produce equal shortest-path lengths in covered cases.
- All agents return legal actions and leave the source state unchanged.
- Minimax and Alpha-Beta agree on the score/action at the same depth over the same generated search tree.
- Alpha-Beta records cutoffs in a deterministic test scenario.
- UI actions, reset, winner display and AI thinking state work.
- Lint, typecheck, tests, and production build pass—or any environment-specific blocker is recorded precisely.
- A smoke benchmark runs and produces genuine output.
- README and `docs/IMPLEMENTATION_STATUS.md` match reality.

## Work style and recovery

- Work in small internally verifiable steps, but do not pause to ask permission at each step.
- After each implementation stage, run the relevant tests and fix failures before progressing.
- At the end, run `npm run check:all`, start or smoke-test the app if the environment supports it, and run `npm run benchmark` with its default small workload. Investigate and fix errors; rerun checks after fixes.
- If a test or command fails, identify the cause and fix it rather than hiding or deleting the failing test.
- If a proposed advanced feature threatens core correctness or completion, reduce scope according to the non-goals (MCTS is explicitly excluded), not the rule-engine acceptance criteria.
- If the environment blocks a command, state the exact command, error, and what alternatives were attempted. Never fabricate success.
- Do not end your work with just advice or a list of future tasks. Implement what is specified in the workspace.

## Final response to me

When finished, summarize: major modules/files created, how to run the app, commands actually run and their observed outcomes, benchmark output location, and any remaining limitations. Be precise—do not claim anything you did not verify.
