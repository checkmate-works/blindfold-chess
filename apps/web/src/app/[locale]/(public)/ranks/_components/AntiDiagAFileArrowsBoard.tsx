'use client';

import { BoardLayout, BoardSkeleton } from '@/app/_components';

import { useBoardTheme } from './useBoardTheme';

const ARROWS = Array.from({ length: 7 }, (_, i) => {
  const startRank = 8 - i; // 8, 7, 6, 5, 4, 3, 2
  return {
    x1: 6.25,
    y1: (8 - startRank) * 12.5 + 6.25,
    x2: (startRank - 1) * 12.5 + 6.25,
    y2: 93.75,
  };
});

export function AntiDiagAFileArrowsBoard({ className }: { className?: string }) {
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
            id="antidiag-a-arrow"
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
            markerEnd="url(#antidiag-a-arrow)"
          />
        ))}
      </svg>
    </div>
  );
}
