'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { BOARD_FRAME_EXPAND_ON_MOBILE_CLASS } from '@/app/_components/chess/BoardFrame';

import { useBoardTheme } from './useBoardTheme';

const DEFAULT_ANCHOR_SQUARES = ['a8', 'h8', 'a1', 'h1'];

type AnchorPointsBoardProps = {
  squares?: string[];
  className?: string;
};

export function AnchorPointsBoard({
  squares = DEFAULT_ANCHOR_SQUARES,
  className,
}: AnchorPointsBoardProps) {
  const { themeColors, showCoordinates, isLoaded } = useBoardTheme();

  const renderSquare = useCallback(() => null, []);

  const squareProps = useCallback(
    ({ square }: SquareRenderInfo) => ({
      highlightType: (squares.includes(square) ? 'last-move' : 'none') as 'last-move' | 'none',
    }),
    [squares]
  );

  if (!isLoaded) {
    return (
      <div className={className ?? BOARD_FRAME_EXPAND_ON_MOBILE_CLASS}>
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className={className ?? BOARD_FRAME_EXPAND_ON_MOBILE_CLASS}>
      <BoardLayout
        showCoordinates={showCoordinates}
        themeColors={themeColors}
        renderSquare={renderSquare}
        squareProps={squareProps}
      />
    </div>
  );
}
