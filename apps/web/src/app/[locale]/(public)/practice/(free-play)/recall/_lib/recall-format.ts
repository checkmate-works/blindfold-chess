/**
 * Render a move's number as the PGN-style prefix shown before its SAN —
 * `"12."` for a white move, `"12..."` for a black move.
 *
 * Shared by the inline feedback line and the move-log table so the prefix
 * is formatted in exactly one place.
 */
export function formatMoveNumberPrefix(moveNumber: number, isWhiteMove: boolean): string {
  return isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`;
}
