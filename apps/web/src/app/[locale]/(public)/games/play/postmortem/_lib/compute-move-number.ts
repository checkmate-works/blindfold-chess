/**
 * Compute the display move number and side-to-move for a given move index.
 *
 * Centralises the pattern that was duplicated across all three handlers
 * in usePostmortemActions.
 */
export function computeMoveNumber(
  index: number,
  startsAsBlack: boolean,
  startMoveNumber: number
): { moveNumber: number; isWhiteMove: boolean } {
  const moveNumber = startsAsBlack
    ? startMoveNumber + Math.floor((index + 1) / 2)
    : startMoveNumber + Math.floor(index / 2);
  const isWhiteMove = startsAsBlack ? index % 2 === 1 : index % 2 === 0;

  return { moveNumber, isWhiteMove };
}
