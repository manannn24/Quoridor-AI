import { Position, GameState, Player } from './types';
import { isEdgeBlocked, BOARD_SIZE } from './walls';

export function isPositionOnBoard(pos: Position): boolean {
  return (
    Number.isInteger(pos.row) &&
    Number.isInteger(pos.col) &&
    pos.row >= 0 &&
    pos.row < BOARD_SIZE &&
    pos.col >= 0 &&
    pos.col < BOARD_SIZE
  );
}

export function arePositionsEqual(p1: Position, p2: Position): boolean {
  return p1.row === p2.row && p1.col === p2.col;
}

/**
 * Returns all legally reachable destination cells for the given player's pawn from the current state.
 * Implements standard Quoridor jump and diagonal-jump rules.
 */
export function getLegalPawnMoves(state: GameState, player: Player): Position[] {
  const currentPos = player === 'P1' ? state.p1Pos : state.p2Pos;
  const opponentPos = player === 'P1' ? state.p2Pos : state.p1Pos;
  const legalMoves: Position[] = [];

  const directions: [number, number][] = [
    [-1, 0], // Up
    [1, 0],  // Down
    [0, -1], // Left
    [0, 1],  // Right
  ];

  for (const [dr, dc] of directions) {
    const nextCell: Position = { row: currentPos.row + dr, col: currentPos.col + dc };

    if (!isPositionOnBoard(nextCell)) {
      continue;
    }

    // Is there a wall between current position and nextCell?
    if (isEdgeBlocked(state.walls, currentPos, nextCell)) {
      continue;
    }

    // Is opponent occupying nextCell?
    if (arePositionsEqual(nextCell, opponentPos)) {
      // Opponent is adjacent with no wall between pawns
      const straightJump: Position = { row: nextCell.row + dr, col: nextCell.col + dc };
      const canJumpStraight =
        isPositionOnBoard(straightJump) &&
        !isEdgeBlocked(state.walls, nextCell, straightJump);

      if (canJumpStraight) {
        // Must jump straight; diagonal jump is prohibited when straight jump is open
        legalMoves.push(straightJump);
      } else {
        // Straight jump is blocked by a wall or board edge -> diagonal jumps allowed
        const perpDirections: [number, number][] =
          dr !== 0
            ? [
                [0, -1],
                [0, 1],
              ]
            : [
                [-1, 0],
                [1, 0],
              ];

        for (const [pdr, pdc] of perpDirections) {
          const diagCell: Position = { row: nextCell.row + pdr, col: nextCell.col + pdc };
          if (
            isPositionOnBoard(diagCell) &&
            !isEdgeBlocked(state.walls, nextCell, diagCell)
          ) {
            legalMoves.push(diagCell);
          }
        }
      }
    } else {
      // Normal unoccupied orthogonal move
      legalMoves.push(nextCell);
    }
  }

  return legalMoves;
}

/**
 * Checks if a candidate destination cell is among legal moves for the player.
 */
export function isLegalPawnMove(state: GameState, player: Player, to: Position): boolean {
  if (!isPositionOnBoard(to)) return false;
  const legalMoves = getLegalPawnMoves(state, player);
  return legalMoves.some((m) => arePositionsEqual(m, to));
}
