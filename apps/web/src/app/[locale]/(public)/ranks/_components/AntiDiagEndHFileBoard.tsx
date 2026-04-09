'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { ChessPieceIcon } from '@blindfold-chess/icons';

import { useBoardTheme } from './useBoardTheme';

const H_FILE_SQUARES = Array.from({ length: 8 }, (_, i) => ({ x: 87.5, y: i * 12.5 }));

const ANTI_DIAGONAL_PATH = [
  { x: 62.5, y: 12.5 }, // f7
  { x: 75, y: 25 }, // g6
  { x: 87.5, y: 37.5 }, // h5
];

export function AntiDiagEndHFileBoard({ className }: { className?: string }) {
  const { themeColors, showCoordinates, isLoaded } = useBoardTheme();

  const renderSquare = useCallback(({ square }: SquareRenderInfo) => {
    if (square === 'f7') {
      return <ChessPieceIcon type="b" color="w" size={32} />;
    }
    return null;
  }, []);

  if (!isLoaded) {
    return (
      <div className={className ?? 'mx-auto max-w-xs sm:max-w-sm'}>
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? 'mx-auto max-w-xs sm:max-w-sm'}`}>
      <BoardLayout
        themeColors={themeColors}
        showCoordinates={showCoordinates}
        renderSquare={renderSquare}
        rounded
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {H_FILE_SQUARES.map((sq, i) => (
          <rect
            key={`a${i}`}
            x={sq.x}
            y={sq.y}
            width={12.5}
            height={12.5}
            fill="#fbbf24"
            opacity={0.25}
          />
        ))}
        {ANTI_DIAGONAL_PATH.map((sq, i) => (
          <rect
            key={`d${i}`}
            x={sq.x}
            y={sq.y}
            width={12.5}
            height={12.5}
            fill="#10b981"
            opacity={0.4}
          />
        ))}
      </svg>
    </div>
  );
}
