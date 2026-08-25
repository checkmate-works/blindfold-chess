/**
 * Compute the disabled state of the previous/next board navigation buttons
 * from a `useMoveNavigation`-style cursor (-2 = start, -1 = latest,
 * 0..movesLength-1 = a specific move).
 *
 * `isNextDisabled` only checks `currentPosition === -1`: `navigateToPosition`
 * (`use-move-navigation.ts`) always collapses the last move's index onto -1
 * before it reaches a consumer, so `currentPosition` never actually rests on
 * `movesLength - 1` — a redundant `currentPosition === movesLength - 1` check
 * can't fire.
 */
export function moveNavDisabledState(
  currentPosition: number,
  movesLength: number
): { isPreviousDisabled: boolean; isNextDisabled: boolean } {
  return {
    isPreviousDisabled: currentPosition === -2 || (currentPosition === -1 && movesLength === 0),
    isNextDisabled: currentPosition === -1,
  };
}
