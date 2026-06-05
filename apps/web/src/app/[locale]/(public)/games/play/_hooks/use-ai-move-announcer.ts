import { useMemo } from 'react';

import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { findLastAiMoveNotation } from '../_lib/find-last-ai-move-label';

type UseAiMoveAnnouncerOptions = {
  moves: AlgebraicNotation[];
  playerSide: Side;
  startingFen: string | undefined;
};

/**
 * Watches the move list and returns the notation of the most recent AI move
 * (e.g. `"1... e5"`), or `null` when there is nothing to announce. The caller
 * wraps it in localized copy (e.g. "AI played **1… e5**") so the move fragment
 * can be bolded.
 *
 * The notation is derived by a pure helper (`findLastAiMoveNotation`) and
 * memoized so the return is referentially stable when inputs are unchanged.
 */
export function useAiMoveAnnouncer({
  moves,
  playerSide,
  startingFen,
}: UseAiMoveAnnouncerOptions): string | null {
  return useMemo(
    () => findLastAiMoveNotation(moves, playerSide, startingFen),
    [moves, playerSide, startingFen]
  );
}
