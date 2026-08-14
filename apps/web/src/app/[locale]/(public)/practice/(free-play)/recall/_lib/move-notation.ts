import type { Side } from '@blindfold-chess/types';

/**
 * Determine whether the current move index corresponds to the player's turn.
 * Returns true if autoOpponent is disabled, otherwise checks the moving side.
 */
export function isPlayerTurn(
  currentMoveIndex: number,
  playerColor: Side,
  autoOpponent: boolean,
  startingFen: string | undefined,
  getMovingSide: (moveIndex: number, fen?: string | null) => Side
): boolean {
  if (!autoOpponent) return true;
  return getMovingSide(currentMoveIndex, startingFen) === playerColor;
}
