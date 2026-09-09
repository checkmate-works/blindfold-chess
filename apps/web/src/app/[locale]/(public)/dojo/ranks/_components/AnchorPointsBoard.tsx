'use client';

import { useCallback } from 'react';

import type { SquareRenderInfo } from '@/app/_components';

import { ThemedBoardLayout } from './_shared/ThemedBoardLayout';

const DEFAULT_ANCHOR_SQUARES = ['a8', 'h8', 'a1', 'h1'];

type AnchorPointsBoardProps = {
  squares?: string[];
  className?: string;
};

export function AnchorPointsBoard({
  squares = DEFAULT_ANCHOR_SQUARES,
  className,
}: AnchorPointsBoardProps) {
  const renderSquare = useCallback(() => null, []);

  const squareProps = useCallback(
    ({ square }: SquareRenderInfo) => ({
      highlightType: (squares.includes(square) ? 'last-move' : 'none') as 'last-move' | 'none',
    }),
    [squares]
  );

  return (
    <ThemedBoardLayout
      renderSquare={renderSquare}
      squareProps={squareProps}
      className={className}
    />
  );
}
