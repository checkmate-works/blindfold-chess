import { useEffect, useMemo } from 'react';

import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { type AiMoveTranslator, findLastAiMoveLabel } from '../_lib/find-last-ai-move-label';

type UseAiMoveAnnouncerOptions = {
  moves: AlgebraicNotation[];
  playerSide: Side;
  startingFen: string | undefined;
  t: AiMoveTranslator;
  onAiMoveChange?: (move: string | null) => void;
};

/**
 * Watches the move list and notifies the parent whenever a new AI move is made,
 * passing a localized label (e.g. `"AI played 1... e5"`) or `null` when there is
 * nothing to announce.
 *
 * The label itself is derived by a pure helper (`findLastAiMoveLabel`) and
 * memoized so the caller is only re-notified when the label actually changes.
 */
export function useAiMoveAnnouncer({
  moves,
  playerSide,
  startingFen,
  t,
  onAiMoveChange,
}: UseAiMoveAnnouncerOptions): void {
  const label = useMemo(
    () => findLastAiMoveLabel(moves, playerSide, startingFen, t),
    [moves, playerSide, startingFen, t]
  );

  useEffect(() => {
    if (!onAiMoveChange) return;
    onAiMoveChange(label);
  }, [label, onAiMoveChange]);
}
