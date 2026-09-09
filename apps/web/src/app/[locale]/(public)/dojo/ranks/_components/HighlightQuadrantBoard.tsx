'use client';

import { useCallback } from 'react';

import type { SquareRenderInfo } from '@/app/_components';

import { ThemedBoardLayout } from './_shared/ThemedBoardLayout';
import type { Quadrant } from './quadrant-colors';
import { QUADRANT_COLORS, getQuadrant } from './quadrant-colors';

type Props = {
  quadrant: Quadrant;
};

export function HighlightQuadrantBoard({ quadrant }: Props) {
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

  return <ThemedBoardLayout renderSquare={renderSquare} squareProps={squareProps} />;
}
