'use client';

import { useCallback } from 'react';

import type { SquareRenderInfo } from '@/app/_components';

import { ThemedBoardLayout } from './_shared/ThemedBoardLayout';

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

  return (
    <ThemedBoardLayout renderSquare={renderSquare} showCoordinates={false} className={className} />
  );
}
