'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';

import { useBoardTheme } from './useBoardTheme';

type Quadrant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const QUADRANT_COLORS: Record<Quadrant, string> = {
  'top-left': 'bg-blue-500/20',
  'top-right': 'bg-emerald-500/20',
  'bottom-left': 'bg-amber-500/20',
  'bottom-right': 'bg-rose-500/20',
};

function getQuadrant(fileIndex: number, rankIndex: number): Quadrant {
  const isTopHalf = rankIndex < 4;
  const isLeftHalf = fileIndex < 4;
  if (isTopHalf && isLeftHalf) return 'top-left';
  if (isTopHalf && !isLeftHalf) return 'top-right';
  if (!isTopHalf && isLeftHalf) return 'bottom-left';
  return 'bottom-right';
}

type Props = {
  quadrant: Quadrant;
};

export function HighlightQuadrantBoard({ quadrant }: Props) {
  const { themeColors, showCoordinates, isLoaded } = useBoardTheme();

  const renderSquare = useCallback(
    ({ fileIndex, rankIndex }: SquareRenderInfo) => {
      const sq = getQuadrant(fileIndex, rankIndex);
      if (sq !== quadrant) return null;

      const colorClass = QUADRANT_COLORS[quadrant];
      return <div className={`absolute inset-0 ${colorClass}`} />;
    },
    [quadrant]
  );

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
