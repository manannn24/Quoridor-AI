# Product Specification

## 1. Target experience

A complete, polished, single-page web game for a student to demonstrate Quoridor AI during a classroom demo. The game should be understandable without reading the source code.

## 2. Main screen

The page should include:

- Title and a one-sentence objective.
- A visually clear 9×9 board.
- Human pawn and computer pawn with distinct colors and labels.
- Visible walls already placed on the board.
- A side panel showing whose turn it is, remaining wall counts, chosen AI strategy, search depth, and last AI decision statistics.
- Controls to choose the AI strategy and search depth before or during a new game.
- A clear status message, validation error, and winner state.
- `New Game` and `Undo Last Turn` controls. Undo should revert one complete turn (human move plus AI response when one exists); if robust undo is difficult, undo at least the last individual action and explain the behavior in the UI.
- Responsive layout for typical laptop and tablet widths; the board remains usable on narrow screens.

## 3. Game interaction

### Pawn movement

- On the human turn, legal destination squares are highlighted.
- The user can click a highlighted destination or use keyboard-accessible controls.
- Illegal moves do not consume a turn and show a short explanatory message.

### Wall placement

- The user can choose `Horizontal Wall` or `Vertical Wall`, then select a valid wall anchor on the board.
- Valid anchors are highlighted while wall placement mode is active. Invalid placements must be rejected without consuming a turn.
- The current placement orientation is visible. Provide a cancel action to return to pawn movement.
- Wall placement consumes exactly one wall from the human's reserve and one turn.

### AI turn

- Show an `AI thinking…` state before search begins.
- Do not permit human board actions while the AI is thinking.
- After the AI returns an action, apply only a legal action and display it on the board.
- Show the AI strategy, completed depth, nodes visited, leaves evaluated, elapsed time, and Alpha-Beta cutoffs where applicable.
- If the AI agent errors, show a recoverable error message and do not silently corrupt the board state.

## 4. AI controls

Provide:

- **Greedy heuristic** — a fast baseline agent.
- **Minimax** — Minimax without pruning, using the same deterministic candidate-action generator as Alpha-Beta.
- **Minimax + Alpha-Beta** — the primary strategy and default selection.
- Depth selector: 1, 2, or 3 plies. Explain that a ply is one player's action. Default depth: 2 for reasonable responsiveness.

The UI can warn that Minimax without pruning may take longer at larger depths. If a selected depth exceeds a safe strategy-specific ceiling, enforce the ceiling and clearly communicate it instead of freezing the UI.

## 5. UI style

- Modern, calm, polished academic-demo aesthetic; no need to imitate another app.
- Contrast between board, squares, pawns, walls, legal move highlights, hover/focus states, and disabled actions must be strong.
- Avoid excessive animation. Use subtle transitions only.
- Use semantic buttons, accessible labels, visible keyboard focus, and color plus shape/label cues so meaning is not conveyed by color alone.
- Respect reduced-motion preferences.
- No remote fonts, image APIs, analytics, or external runtime assets are required.

## 6. Status and error messages

Examples:

- `Your turn — move your pawn or place a wall.`
- `That wall would block every route to the goal. Choose another position.`
- `No walls remaining.`
- `Computer is thinking…`
- `You win!` / `Computer wins!`

Messages should be concise and human-readable, not stack traces.

## 7. Reset behavior

- `New Game` starts from the standard initial state and clears status/history/metrics.
- Changing AI strategy/depth during a game affects the next AI turn only; document this in a tooltip or nearby hint.
- No data needs to persist after refresh.

## 8. Explicit UI non-requirements

No login, leaderboard, online opponents, server, database, external API, user profile, or elaborate settings page.
