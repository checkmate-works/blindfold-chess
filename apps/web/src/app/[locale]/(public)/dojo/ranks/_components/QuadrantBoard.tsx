'use client';

import { useCallback } from 'react';

import type { SquareRenderInfo } from '@/app/_components';

import { ThemedBoardLayout } from './_shared/ThemedBoardLayout';
import { QUADRANT_COLORS, getQuadrant } from './quadrant-colors';

export function QuadrantBoard() {
  const renderSquare = useCallback(({ fileIndex, rankIndex }: SquareRenderInfo) => {
    const colorClass = QUADRANT_COLORS[getQuadrant(fileIndex, rankIndex)];

    const borderRight = fileIndex === 3 ? 'border-r-2 border-r-foreground/50' : '';
    const borderBottom = rankIndex === 3 ? 'border-b-2 border-b-foreground/50' : '';

    return <div className={`absolute inset-0 ${colorClass} ${borderRight} ${borderBottom}`} />;
  }, []);

  const squareProps = useCallback(() => ({}), []);

  return <ThemedBoardLayout renderSquare={renderSquare} squareProps={squareProps} />;
}
