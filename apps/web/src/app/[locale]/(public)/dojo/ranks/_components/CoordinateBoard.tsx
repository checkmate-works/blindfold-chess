'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { BOARD_FRAME_EXPAND_ON_MOBILE_CLASS } from '@/app/_components/chess/BoardFrame';

import { useBoardTheme } from './useBoardTheme';

type CoordinateBoardProps = {
  className?: string;
};

/**
 * Full 8x8 chess board with coordinate labels displayed inside every square.
 *
 * Used as a visual aid in the Mukyu (無級) guide and Tips card to illustrate
 * the algebraic notation coordinate system. Each square shows its coordinate
 * name (e.g. "a8", "e4") so users can learn the mapping visually.
 */
export function CoordinateBoard({ className }: CoordinateBoardProps) {
  const { themeColors, isLoaded } = useBoardTheme();

  const renderSquare = useCallback(
    ({ square, isLight }: SquareRenderInfo) => (
      <span
        className={`text-[0.55rem] sm:text-[0.7rem] font-semibold select-none ${
          isLight ? 'text-black/50' : 'text-white/50'
        }`}
      >
        {square}
      </span>
    ),
    []
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
      <BoardLayout showCoordinates={false} themeColors={themeColors} renderSquare={renderSquare} />
    </div>
  );
}
