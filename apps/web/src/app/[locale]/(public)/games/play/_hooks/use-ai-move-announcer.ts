import { useMemo } from 'react';

import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { type AiMoveTranslator, findLastAiMoveLabel } from '../_lib/find-last-ai-move-label';

type UseAiMoveAnnouncerOptions = {
  moves: AlgebraicNotation[];
  playerSide: Side;
  startingFen: string | undefined;
  t: AiMoveTranslator;
};

/**
 * Watches the move list and returns a localized label for the most recent AI
 * move (e.g. `"AI played 1... e5"`), or `null` when there is nothing to
 * announce.
 *
 * The label itself is derived by a pure helper (`findLastAiMoveLabel`) and
 * memoized so the return is referentially stable when inputs are unchanged.
 */
export function useAiMoveAnnouncer({
  moves,
  playerSide,
  startingFen,
  t,
}: UseAiMoveAnnouncerOptions): string | null {
  return useMemo(
    () => findLastAiMoveLabel(moves, playerSide, startingFen, t),
    [moves, playerSide, startingFen, t]
  );
}
