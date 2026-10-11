import { Wall, Position } from './types';

export const BOARD_SIZE = 9;
export const MAX_WALL_ANCHOR = 7; // 0..7 for 8x8 anchor grid

/**
 * Checks if a wall anchor is within board bounds (0..7).
 */
export function isValidWallAnchor(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row <= MAX_WALL_ANCHOR &&
    col >= 0 &&
    col <= MAX_WALL_ANCHOR
  );
}

/**
 * String representation of a wall for hashing / quick lookups.
 */
export function wallKey(wall: Wall): string {
  return `${wall.orientation[0].toUpperCase()}:${wall.row},${wall.col}`;
}

/**
 * Checks if two positions are orthogonal neighbors on the 9x9 board.
 */
export function areOrthogonalNeighbors(p1: Position, p2: Position): boolean {
  const dr = Math.abs(p1.row - p2.row);
  const dc = Math.abs(p1.col - p2.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

/**
 * Determines whether movement between two adjacent cells `from` and `to` is blocked by any wall in `walls`.
 */
export function isEdgeBlocked(walls: Wall[], from: Position, to: Position): boolean {
  const dr = to.row - from.row;
  const dc = to.col - from.col;

  // Vertical movement between (r, c) and (r+1, c)
  if (dc === 0 && Math.abs(dr) === 1) {
    const minRow = Math.min(from.row, to.row);
    const col = from.col;
    // Blocked if a horizontal wall exists at (minRow, col) or (minRow, col - 1)
    for (const w of walls) {
      if (w.orientation === 'horizontal' && w.row === minRow) {
        if (w.col === col || w.col === col - 1) {
          return true;
        }
      }
    }
    return false;
  }

  // Horizontal movement between (r, c) and (r, c+1)
  if (dr === 0 && Math.abs(dc) === 1) {
    const minCol = Math.min(from.col, to.col);
    const row = from.row;
    // Blocked if a vertical wall exists at (row, minCol) or (row - 1, minCol)
    for (const w of walls) {
      if (w.orientation === 'vertical' && w.col === minCol) {
        if (w.row === row || w.row === row - 1) {
          return true;
        }
      }
    }
    return false;
  }

  // Not adjacent cells
  return true;
}

/**
 * Validates wall placement against board bounds, existing wall overlap, and perpendicular crossings.
 * Endpoint touching (T-junctions, L-corners) is allowed.
 */
export function canPlaceWallGeometrically(
  existingWalls: Wall[],
  newWall: Wall
): { valid: boolean; reason?: string } {
  if (newWall.orientation !== 'horizontal' && newWall.orientation !== 'vertical') {
    return {
      valid: false,
      reason: `Invalid wall orientation: ${newWall.orientation}. Must be 'horizontal' or 'vertical'.`,
    };
  }

  if (!isValidWallAnchor(newWall.row, newWall.col)) {
    return {
      valid: false,
      reason: `Wall anchor (${newWall.row}, ${newWall.col}) is outside valid range 0..${MAX_WALL_ANCHOR}.`,
    };
  }

  for (const existing of existingWalls) {
    // Exact duplicate
    if (
      existing.row === newWall.row &&
      existing.col === newWall.col &&
      existing.orientation === newWall.orientation
    ) {
      return {
        valid: false,
        reason: `Wall already exists at (${newWall.row}, ${newWall.col}) with ${newWall.orientation} orientation.`,
      };
    }

    // Perpendicular crossing at the same anchor point (r, c)
    if (
      existing.row === newWall.row &&
      existing.col === newWall.col &&
      existing.orientation !== newWall.orientation
    ) {
      return {
        valid: false,
        reason: `Walls cannot cross perpendicularly at anchor (${newWall.row}, ${newWall.col}).`,
      };
    }

    // Same orientation overlap
    if (existing.orientation === newWall.orientation) {
      if (newWall.orientation === 'horizontal') {
        // Horizontal walls on same row cannot overlap columns: c and c-1 or c+1
        if (existing.row === newWall.row && Math.abs(existing.col - newWall.col) === 1) {
          return {
            valid: false,
            reason: `Horizontal wall overlaps existing horizontal wall segment at (${existing.row}, ${existing.col}).`,
          };
        }
      } else {
        // Vertical walls on same column cannot overlap rows: r and r-1 or r+1
        if (existing.col === newWall.col && Math.abs(existing.row - newWall.row) === 1) {
          return {
            valid: false,
            reason: `Vertical wall overlaps existing vertical wall segment at (${existing.row}, ${existing.col}).`,
          };
        }
      }
    }
  }

  return { valid: true };
}
