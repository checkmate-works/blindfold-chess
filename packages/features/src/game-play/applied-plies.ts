/**
 * How many of a game's moves have been played at a `useMoveNavigation`-style
 * cursor (-2 = start, -1 = latest, 0..movesLength-1 = after that move) —
 * equivalently, the index into a positions-from-start array (`replayMoves`)
 * of the position the cursor shows. The companion of
 * {@link moveNavDisabledState}, which reads the same cursor.
 */
export function appliedPliesAt(
  currentPosition: number,
  movesLength: number,
): number {
  if (currentPosition === -2) return 0;
  if (currentPosition === -1) return movesLength;
  return currentPosition + 1;
}
