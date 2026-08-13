'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';

import { QUADRANT_COLORS, getQuadrant } from './quadrant-colors';
import { useBoardTheme } from './useBoardTheme';

export function QuadrantBoard() {
  const { themeColors, showCoordinates, isLoaded } = useBoardTheme();

  const renderSquare = useCallback(({ fileIndex, rankIndex }: SquareRenderInfo) => {
    const colorClass = QUADRANT_COLORS[getQuadrant(fileIndex, rankIndex)];

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
        showCoordinates={showCoordinates}
        themeColors={themeColors}
        renderSquare={renderSquare}
        squareProps={squareProps}
      />
    </div>
  );
}
