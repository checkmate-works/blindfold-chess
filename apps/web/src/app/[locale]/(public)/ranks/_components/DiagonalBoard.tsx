'use client';

import { BoardLayout, BoardSkeleton } from '@/app/_components';

import { useBoardTheme } from './useBoardTheme';

const DIAGONAL_SQUARES = [
  { x: 0, y: 87.5 },
  { x: 12.5, y: 75 },
  { x: 25, y: 62.5 },
  { x: 37.5, y: 50 },
  { x: 50, y: 37.5 },
  { x: 62.5, y: 25 },
  { x: 75, y: 12.5 },
  { x: 87.5, y: 0 },
];

export function DiagonalBoard({ className }: { className?: string }) {
  const { themeColors, showCoordinates, isLoaded } = useBoardTheme();

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
        renderSquare={() => null}
        rounded
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full text-emerald-500"
      >
        {DIAGONAL_SQUARES.map((sq, i) => (
          <rect
            key={i}
            x={sq.x}
            y={sq.y}
            width={12.5}
            height={12.5}
            fill="currentColor"
            opacity={0.4}
          />
        ))}
      </svg>
    </div>
  );
}
