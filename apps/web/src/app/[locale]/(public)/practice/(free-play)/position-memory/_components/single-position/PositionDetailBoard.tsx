'use client';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  fen: string;
  flipped: boolean;
};

/**
 * Client wrapper around `AnimatedChessBoard` that injects the user's
 * board theme preference.
 *
 * The detail page is a Server Component, so it cannot read the theme
 * preference directly via `useGamePreferences`. This thin wrapper keeps
 * the board in sync with the theme used on the session/recreate screens.
 */
export function PositionDetailBoard({ fen, flipped }: Props) {
  const { preferences } = useGamePreferences();

  return (
    <AnimatedChessBoard
      initialFen={fen}
      showCoordinates={true}
      flipped={flipped}
      boardTheme={preferences.boardTheme}
    />
  );
}
