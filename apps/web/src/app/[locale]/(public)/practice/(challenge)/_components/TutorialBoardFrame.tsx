'use client';

import type { ReactNode } from 'react';

import { BoardSkeleton } from '@/app/_components';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  /** Position the tutorial illustrates — often an empty board. */
  fen: string;
  /** SVG overlay drawn on top of the board (arrows, tinted squares, labels). */
  children?: ReactNode;
};

/**
 * The square board panel a stepped tutorial draws its illustration on: the
 * board at the reader's own theme, with an SVG overlay on top, and a skeleton
 * in its place until preferences have loaded (so the board never flashes at the
 * default theme first).
 *
 * Owns the preferences read, so tutorials that only ever needed the board
 * theme no longer touch `useGamePreferences` themselves.
 */
export function TutorialBoardFrame({ fen, children }: Props) {
  const { preferences, isLoaded } = useGamePreferences();

  return (
    <div className="aspect-square bg-secondary/30 rounded-lg overflow-hidden mb-6 relative">
      {!isLoaded ? (
        <BoardSkeleton rounded={false} />
      ) : (
        <AnimatedChessBoard
          initialFen={fen}
          showCoordinates={true}
          flipped={false}
          boardTheme={preferences.boardTheme}
        >
          {children}
        </AnimatedChessBoard>
      )}
    </div>
  );
}
