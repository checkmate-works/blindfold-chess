'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { BOARD_FRAME_EXPAND_ON_MOBILE_CLASS } from '@/app/_components/chess/BoardFrame';

import type { Quadrant } from './quadrant-colors';
import { QUADRANT_COLORS, getQuadrant } from './quadrant-colors';
import { useBoardTheme } from './useBoardTheme';

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
      <div className={BOARD_FRAME_EXPAND_ON_MOBILE_CLASS}>
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className={BOARD_FRAME_EXPAND_ON_MOBILE_CLASS}>
      <BoardLayout
        showCoordinates={showCoordinates}
        themeColors={themeColors}
        renderSquare={renderSquare}
        squareProps={squareProps}
      />
    </div>
  );
}
