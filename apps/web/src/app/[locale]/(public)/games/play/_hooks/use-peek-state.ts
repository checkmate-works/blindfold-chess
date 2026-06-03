'use client';

import { useCallback, useState } from 'react';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Params = {
  boardVisibility: GamePreferences['boardVisibility'];
  /** Audit hook: count a deliberate peek when the masked board is revealed. */
  recordPeek: () => void;
};

type Result = {
  /** Whether the always-present board frame is currently covered. */
  boardMasked: boolean;
  /** Reveal the masked board for a peek (counts it). */
  handleRevealBoard: () => void;
  /** Re-mask the board — call after each committed move (no-op in 'always'). */
  remask: () => void;
};

/**
 * Blindfold peek/mask state for the always-present play board, extracted from
 * `PlayClient`.
 *
 * The board frame is always on screen (same position/size). In `'peek'` mode it
 * is masked until the player taps to reveal, then re-masked on their next move
 * so each look is a discrete, counted peek. `'always'` is never masked;
 * `'never'` is always masked (reveal has no effect there).
 */
export function usePeekState({ boardVisibility, recordPeek }: Params): Result {
  const [peekRevealed, setPeekRevealed] = useState(false);

  const handleRevealBoard = useCallback(() => {
    recordPeek();
    setPeekRevealed(true);
  }, [recordPeek]);

  const remask = useCallback(() => setPeekRevealed(false), []);

  const boardMasked = boardVisibility === 'never' || (boardVisibility === 'peek' && !peekRevealed);

  return { boardMasked, handleRevealBoard, remask };
}
