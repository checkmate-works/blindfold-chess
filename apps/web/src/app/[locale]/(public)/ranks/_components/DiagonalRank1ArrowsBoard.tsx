'use client';

import { BoardLayout, BoardSkeleton } from '@/app/_components';

import { useBoardTheme } from './useBoardTheme';

const ARROWS = Array.from({ length: 6 }, (_, i) => {
  const startFile = i + 2;
  const endRank = 9 - startFile;
  return {
    x1: (startFile - 1) * 12.5 + 6.25,
    y1: 93.75,
    x2: 93.75,
    y2: (8 - endRank) * 12.5 + 6.25,
  };
});

export function DiagonalRank1ArrowsBoard({ className }: { className?: string }) {
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
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <defs>
          <marker
            id="diag-r1-arrow"
            markerWidth="4"
            markerHeight="3"
            refX="3.5"
            refY="1.5"
            orient="auto"
          >
            <path d="M 0 0 L 4 1.5 L 0 3 Z" fill="#10b981" />
          </marker>
        </defs>
        {ARROWS.map((a, i) => (
          <line
            key={i}
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            stroke="#10b981"
            strokeWidth={1.2}
            opacity={0.7}
            markerEnd="url(#diag-r1-arrow)"
          />
        ))}
      </svg>
    </div>
  );
}
