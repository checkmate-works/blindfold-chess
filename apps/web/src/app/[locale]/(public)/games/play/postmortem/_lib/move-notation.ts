import type { MoveLogEntry } from './evaluation-helpers';

/**
 * Format a move notation string for display (e.g., "1. e4" or "1... e5").
 */
export function formatMoveNotation(entry: MoveLogEntry): string {
  return entry.isWhiteMove
    ? `${entry.moveNumber}. ${entry.move}`
    : `${entry.moveNumber}... ${entry.move}`;
}

/**
 * Determine whether the current move index corresponds to the player's turn.
 * Returns true if autoOpponent is disabled, otherwise checks the moving side.
 */
export function isPlayerTurn(
  currentMoveIndex: number,
  playerColor: 'white' | 'black',
  autoOpponent: boolean,
  startingFen: string | undefined,
  getMovingSide: (moveIndex: number, fen?: string | null) => 'white' | 'black'
): boolean {
  if (!autoOpponent) return true;
  return getMovingSide(currentMoveIndex, startingFen) === playerColor;
}
