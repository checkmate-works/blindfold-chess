/**
 * Compute the display move number and side-to-move for a given move index.
 *
 * Centralises the pattern that was duplicated across all three handlers
 * in useRecallActions.
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

/**
 * Inverse of {@link computeMoveNumber}: given a "N." / "N..." reference,
 * find the 0-based move index it names. Returns -1 when the combination
 * cannot occur (e.g. a white-move reference numbered before the game's
 * first move). Kept next to its forward counterpart so the round-trip
 * invariant (see the shared test file) stays in one place.
 */
export function plyFromMoveNumber(
  moveNumber: number,
  isWhiteMove: boolean,
  startsAsBlack: boolean,
  startMoveNumber: number
): number {
  const k = moveNumber - startMoveNumber;
  if (k < 0) return -1;

  const ply = startsAsBlack ? (isWhiteMove ? 2 * k - 1 : 2 * k) : isWhiteMove ? 2 * k : 2 * k + 1;

  return ply < 0 ? -1 : ply;
}
