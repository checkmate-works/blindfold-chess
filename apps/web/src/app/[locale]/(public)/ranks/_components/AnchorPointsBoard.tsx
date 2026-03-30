'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

const ANCHOR_SQUARES = ['a8', 'h8', 'a1', 'h1'];

export function AnchorPointsBoard() {
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  const renderSquare = useCallback(() => null, []);

  const squareProps = useCallback(
    ({ square }: SquareRenderInfo) => ({
      highlightType: (ANCHOR_SQUARES.includes(square) ? 'last-move' : 'none') as
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
