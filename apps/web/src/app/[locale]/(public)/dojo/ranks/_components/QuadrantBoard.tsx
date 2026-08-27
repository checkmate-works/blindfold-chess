'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import {
  BOARD_FRAME_EXPAND_ON_MOBILE_CLASS,
  BOARD_RADIUS_EXPAND_ON_MOBILE,
} from '@/app/_components/chess/BoardFrame';

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
      <div className={BOARD_FRAME_EXPAND_ON_MOBILE_CLASS}>
        <BoardSkeleton rounded={BOARD_RADIUS_EXPAND_ON_MOBILE} />
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
        rounded={BOARD_RADIUS_EXPAND_ON_MOBILE}
      />
    </div>
  );
}
