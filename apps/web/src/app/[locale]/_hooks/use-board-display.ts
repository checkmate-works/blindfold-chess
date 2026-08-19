'use client';

import type { MoveSquares } from '@/lib/board/move-squares';
import type { BoardTheme } from '@/lib/games/board-themes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type LastMove = MoveSquares | null | undefined;

/** The display half of the board preferences, resolved and ready to spread. */
export type BoardDisplay = {
  showCoordinates: boolean;
  boardTheme: BoardTheme;
  lastMove: MoveSquares | null;
};

type DisplayPreferences = {
  showCoordinates: boolean;
  boardTheme: BoardTheme;
  highlightLastMove: boolean;
};

/**
 * Resolve the three "how a board looks" preferences into board props.
 *
 * `highlightLastMove` is the one that does not map onto a prop of its own: a
 * board highlights whatever `lastMove` it is handed, so honouring the setting
 * means passing `null` instead. Left to each call site, that is a step to
 * forget — and it was forgotten in six of them (the repertoire viewers, the
 * kata replay, the shared-game review, the comment's move-reference preview),
 * which highlighted regardless of the setting, while the attached-game modal
 * had no last-move plumbing at all and so never highlighted. Every board that
 * renders someone's saved position now resolves its display props here.
 *
 * Use {@link useBoardDisplay} where the viewer's global preferences apply, and
 * this function where a component already holds a `GamePreferences` (a game
 * carries its own settings, so `useGamePreferences` would be the wrong source).
 */
export function resolveBoardDisplay(
  preferences: DisplayPreferences,
  lastMove: LastMove
): BoardDisplay {
  return {
    showCoordinates: preferences.showCoordinates,
    boardTheme: preferences.boardTheme,
    lastMove: preferences.highlightLastMove ? (lastMove ?? null) : null,
  };
}

/** {@link resolveBoardDisplay} against the viewer's global preferences. */
export function useBoardDisplay(lastMove?: LastMove): BoardDisplay {
  const { preferences } = useGamePreferences();
  return resolveBoardDisplay(preferences, lastMove);
}
