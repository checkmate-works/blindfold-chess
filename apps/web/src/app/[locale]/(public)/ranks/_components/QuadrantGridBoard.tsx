'use client';

import type { ReactNode } from 'react';

import { isLightSquare } from '@blindfold-chess/features/common';

import { useBoardTheme } from './useBoardTheme';

type QuadrantGridBoardProps = {
  files: string[];
  ranks: string[];
  fileOffset: number;
  rankOffset: number;
  highlightedSquares?: string[];
  svgOverlay?: ReactNode;
};

export function QuadrantGridBoard({
  files,
  ranks,
  fileOffset,
  rankOffset,
  highlightedSquares = [],
  svgOverlay,
}: QuadrantGridBoardProps) {
  const { themeColors, showCoordinates, isLoaded } = useBoardTheme();

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-xs sm:max-w-sm">
        <div className="aspect-square w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xs sm:max-w-sm">
      <div className="relative w-full aspect-square overflow-hidden rounded-md">
        {ranks.map((rank, rankDisplayIndex) => {
          const actualRankIndex = rankDisplayIndex + rankOffset;
          return (
            <div key={rank} className="flex h-[25%]">
              {files.map((file, fileDisplayIndex) => {
                const actualFileIndex = fileDisplayIndex + fileOffset;
                const square = `${file}${rank}`;
                const isLight = isLightSquare(actualFileIndex, actualRankIndex);
                const isHighlighted = highlightedSquares.includes(square);

                const squareColorClass = isLight ? themeColors.light : themeColors.dark;
                const coordinateColorClass = isLight
                  ? themeColors.lightCoordinates
                  : themeColors.darkCoordinates;
                const highlightClass = isHighlighted ? 'ring-2 ring-yellow-400 ring-inset' : '';

                return (
                  <div
                    key={file}
                    className={`w-[25%] h-full relative flex items-center justify-center ${squareColorClass} ${highlightClass}`}
                  >
                    {/* Rank coordinate on left edge */}
                    {showCoordinates && fileDisplayIndex === 0 && (
                      <div
                        className={`absolute left-0.5 top-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${coordinateColorClass}`}
                      >
                        {rank}
                      </div>
                    )}
                    {/* File coordinate on bottom edge */}
                    {showCoordinates && rankDisplayIndex === 3 && (
                      <div
                        className={`absolute right-0.5 bottom-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${coordinateColorClass}`}
                      >
                        {file}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {svgOverlay}
      </div>
    </div>
  );
}
