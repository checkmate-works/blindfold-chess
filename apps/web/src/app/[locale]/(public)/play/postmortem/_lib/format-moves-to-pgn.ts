import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

/**
 * Format a list of user moves into structured PGN move pairs.
 *
 * Handles both standard (white-first) and black-first starting positions.
 */
export function formatMovesToPgn(
  userMoves: AlgebraicNotation[],
  startsAsBlack: boolean,
  startMoveNumber: number
): FormattedPgnMove[] {
  if (userMoves.length === 0) return [];

  const formatted: FormattedPgnMove[] = [];

  if (startsAsBlack) {
    formatted.push({
      moveNumber: startMoveNumber,
      blackMove: userMoves[0],
      blackMoveIndex: 0,
    });
    for (let i = 1; i < userMoves.length; i += 2) {
      const moveNumber = startMoveNumber + Math.floor((i + 1) / 2);
      formatted.push({
        moveNumber,
        whiteMove: userMoves[i],
        whiteMoveIndex: i,
        blackMove: userMoves[i + 1],
        blackMoveIndex: userMoves[i + 1] !== undefined ? i + 1 : undefined,
      });
    }
  } else {
    for (let i = 0; i < userMoves.length; i += 2) {
      const moveNumber = startMoveNumber + Math.floor(i / 2);
      formatted.push({
        moveNumber,
        whiteMove: userMoves[i],
        whiteMoveIndex: i,
        blackMove: userMoves[i + 1],
        blackMoveIndex: userMoves[i + 1] !== undefined ? i + 1 : undefined,
      });
    }
  }

  return formatted;
}
