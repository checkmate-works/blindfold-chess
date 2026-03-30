'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

export function QuadrantBoard() {
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  const renderSquare = useCallback(({ fileIndex, rankIndex }: SquareRenderInfo) => {
    const isTopHalf = rankIndex < 4;
    const isLeftHalf = fileIndex < 4;

    let colorClass: string;
    if (isTopHalf && isLeftHalf) colorClass = 'bg-blue-500/20';
    else if (isTopHalf && !isLeftHalf) colorClass = 'bg-emerald-500/20';
    else if (!isTopHalf && isLeftHalf) colorClass = 'bg-amber-500/20';
    else colorClass = 'bg-rose-500/20';

    const borderRight = fileIndex === 3 ? 'border-r-2 border-r-foreground/50' : '';
    const borderBottom = rankIndex === 3 ? 'border-b-2 border-b-foreground/50' : '';

    return <div className={`absolute inset-0 ${colorClass} ${borderRight} ${borderBottom}`} />;
  }, []);

  const squareProps = useCallback(() => ({}), []);

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
