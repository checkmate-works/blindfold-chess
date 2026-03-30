'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

const ALL_ANCHOR_SQUARES = [
  'a8',
  'd8',
  'e8',
  'h8',
  'a5',
  'd5',
  'e5',
  'h5',
  'a4',
  'd4',
  'e4',
  'h4',
  'a1',
  'd1',
  'e1',
  'h1',
];

export function AllAnchorPointsBoard() {
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  const renderSquare = useCallback(() => null, []);

  const squareProps = useCallback(
    ({ square }: SquareRenderInfo) => ({
      highlightType: (ALL_ANCHOR_SQUARES.includes(square) ? 'last-move' : 'none') as
        | 'last-move'
        | 'none',
    }),
    []
  );

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-xs sm:max-w-sm">
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xs sm:max-w-sm">
      <BoardLayout
        showCoordinates={preferences.showCoordinates}
        themeColors={themeColors}
        renderSquare={renderSquare}
        squareProps={squareProps}
      />
    </div>
  );
}
