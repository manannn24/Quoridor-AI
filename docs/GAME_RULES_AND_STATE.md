# Game Rules and State Model

This document defines the version-1 rules baseline. Keep engine code independent from React.

## 1. Standard 2-player setup

- Board: 9 rows × 9 columns (81 cells).
- Each player starts with 10 walls.
- Human (`P1`) starts at row 8, column 4 and aims to reach any cell in row 0.
- Computer (`P2`) starts at row 0, column 4 and aims to reach any cell in row 8.
- Human moves first.
- Players alternate one action per turn: either move the pawn or place one wall.
- Walls are permanent and cannot be removed or moved.

Use zero-based coordinates. `row = 0` is the top row; `row = 8` is the bottom row.

## 2. Pawn movement

- Normal movement is one cell up, down, left, or right.
- A movement edge is blocked if a wall occupies the corresponding gap.
- A pawn cannot leave the board or land on the other pawn's current cell.
- When the opponent is on the immediately adjacent cell and there is no wall between the two pawns:
  1. If the cell immediately beyond the opponent is on the board and the edge behind the opponent is open, the active pawn must be allowed to jump straight over the opponent to that cell.
  2. If the straight landing cell is unavailable because of the board edge or a wall behind the opponent, allow diagonal movement to either side of the opponent, provided the diagonal landing cell is on the board and the relevant edge from the opponent to that cell is open.
- Do not allow a diagonal jump if a straight jump is available; follow the standard rule above.
- A move to a goal-row cell wins immediately.

## 3. Wall coordinates and geometry

A wall is defined by:

```ts
type WallOrientation = 'horizontal' | 'vertical';
type Wall = { row: number; col: number; orientation: WallOrientation };
```

There are 8×8 possible anchor coordinates (`row` and `col` each 0…7) for each orientation.

- A horizontal wall at `(r, c)` blocks vertical movement between rows `r` and `r+1` at columns `c` and `c+1`.
- A vertical wall at `(r, c)` blocks horizontal movement between columns `c` and `c+1` at rows `r` and `r+1`.
- All wall anchors must be within 0…7.
- Walls may not overlap existing wall segments.
- Perpendicular walls may not cross at the same anchor.
- Endpoint contact is allowed only where the two wall geometries meet without overlapping or crossing; implement collision checks using occupied wall segments/intersections, not only string equality of coordinates.
- Wall placement is invalid if, after placement, either player has no route to their goal row.
- A player with zero remaining walls cannot place another wall.

The agent must add unit tests for same-orientation overlap, perpendicular crossing, legal endpoint adjacency, edge anchors, out-of-range anchors, and route preservation. If implementation investigation shows a rule nuance, prioritize consistent standard two-player Quoridor rules and document the adopted geometry.

## 4. Path existence and distances

For wall legality and shortest-path calculations, model the board as a graph of 81 cell positions. Edges exist between orthogonally adjacent cells unless a wall blocks that connection. The path-existence test concerns wall barriers and goal reachability; it should not treat the opponent pawn as a permanent obstacle because that pawn moves and can be jumped.

- Human goal set: every cell in row 0.
- Computer goal set: every cell in row 8.
- A valid wall must leave at least one path from each current pawn position to its own goal set.

## 5. Suggested state representation

The precise TypeScript structure is an implementation choice, but the state must contain:

- Both players' positions.
- All currently placed walls with orientation and anchor.
- Remaining wall counts per player.
- Active player.
- Winner or terminal status.
- Optional move number/history stored outside the core search state if that keeps search cloning efficient.

Keep state transitions immutable or safely clone all modified structures so exploring one search branch never corrupts another branch.

## 6. Actions

Use discriminated unions, for example:

```ts
type Action =
  | { type: 'move'; to: Position }
  | { type: 'placeWall'; wall: Wall };
```

The engine must provide distinct functions for:

- Legal pawn destinations.
- Geometric wall validation.
- Full wall validation including path preservation.
- Applying a validated action.
- Determining the winner/terminal state.
- Generating legal actions for UI use.

The search agent may use a documented pruned candidate action set, but every selected action must be legal under the full rules engine.

## 7. Error handling

Invalid user actions must not mutate state, reduce wall reserves, or switch turns. Search actions should be drawn from the action generator and be validated in development/tests so internal bugs are caught early.
