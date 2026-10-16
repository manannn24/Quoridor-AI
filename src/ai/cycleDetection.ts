import { GameState } from '../game/types';

/**
 * Returns a canonical, deterministic string signature for any Quoridor board state.
 * Encodes pawn coordinates, wall reserves, turn, and canonically sorted wall positions.
 */
export function getStateSignature(state: GameState): string {
  const wallStrs = state.walls
    .map((w) => `${w.orientation[0].toUpperCase()}:${w.row},${w.col}`)
    .sort()
    .join(';');

  return `P1:${state.p1Pos.row},${state.p1Pos.col}|P2:${state.p2Pos.row},${state.p2Pos.col}|W:${state.p1WallsRemaining},${state.p2WallsRemaining}|T:${state.activePlayer}|WLS:[${wallStrs}]`;
}

export interface CycleDiagnosticResult {
  isRepeated: boolean;
  repetitionCount: number;
  lastSeenPliesAgo?: number;
  message?: string;
}

/**
 * Diagnostic detector for repeated board positions / pawn oscillations.
 * Checks whether the current state signature has occurred previously in move history.
 *
 * NOTE: This is an informational diagnostic and does NOT force a draw or alter
 * official Quoridor rules.
 */
export function detectCycle(
  history: GameState[] | string[],
  currentState?: GameState
): CycleDiagnosticResult {
  if (history.length === 0 && !currentState) {
    return { isRepeated: false, repetitionCount: 0 };
  }

  const signatures: string[] = history.map((item) =>
    typeof item === 'string' ? item : getStateSignature(item)
  );

  const currentSig = currentState
    ? getStateSignature(currentState)
    : signatures[signatures.length - 1];

  let repetitionCount = 0;
  let lastSeenIndex = -1;

  // Search past occurrences (excluding the final current entry if currentState was not passed)
  const searchLimit = currentState ? signatures.length : signatures.length - 1;

  for (let i = searchLimit - 1; i >= 0; i--) {
    if (signatures[i] === currentSig) {
      repetitionCount++;
      if (lastSeenIndex === -1) {
        lastSeenIndex = i;
      }
    }
  }

  if (repetitionCount > 0) {
    const lastSeenPliesAgo = searchLimit - lastSeenIndex;
    return {
      isRepeated: true,
      repetitionCount: repetitionCount + 1, // total visits to this exact position
      lastSeenPliesAgo,
      message: `Repeated board position visited ${repetitionCount + 1} times (last visited ${lastSeenPliesAgo} plies ago).`,
    };
  }

  return {
    isRepeated: false,
    repetitionCount: 1,
  };
}
