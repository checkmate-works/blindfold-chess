'use client';

import { isLightSquare } from '@blindfold-chess/features/common';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Quadrant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const QUADRANT_CONFIG: Record<
  Quadrant,
  { files: string[]; ranks: string[]; fileOffset: number; rankOffset: number }
> = {
  'top-left': {
    files: ['a', 'b', 'c', 'd'],
    ranks: ['8', '7', '6', '5'],
    fileOffset: 0,
    rankOffset: 0,
  },
  'top-right': {
    files: ['e', 'f', 'g', 'h'],
    ranks: ['8', '7', '6', '5'],
    fileOffset: 4,
    rankOffset: 0,
  },
  'bottom-left': {
    files: ['a', 'b', 'c', 'd'],
    ranks: ['4', '3', '2', '1'],
    fileOffset: 0,
    rankOffset: 4,
  },
  'bottom-right': {
    files: ['e', 'f', 'g', 'h'],
    ranks: ['4', '3', '2', '1'],
    fileOffset: 4,
    rankOffset: 4,
  },
};

type MiniBoardProps = {
  highlightedSquares?: string[];
  quadrant?: Quadrant;
};

export function MiniBoard({ highlightedSquares = [], quadrant = 'top-left' }: MiniBoardProps) {
  const config = QUADRANT_CONFIG[quadrant];
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-xs sm:max-w-sm">
        <div className="aspect-square w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xs sm:max-w-sm">
      <div className="relative w-full aspect-square border border-border overflow-hidden rounded-md shadow-lg">
        {config.ranks.map((rank, rankDisplayIndex) => {
          const actualRankIndex = rankDisplayIndex + config.rankOffset;
          return (
            <div key={rank} className="flex h-[25%]">
              {config.files.map((file, fileDisplayIndex) => {
                const actualFileIndex = fileDisplayIndex + config.fileOffset;
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
                    {preferences.showCoordinates && fileDisplayIndex === 0 && (
                      <div
                        className={`absolute left-0.5 top-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${coordinateColorClass}`}
                      >
                        {rank}
                      </div>
                    )}
                    {/* File coordinate on bottom edge */}
                    {preferences.showCoordinates && rankDisplayIndex === 3 && (
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
      </div>
    </div>
  );
}
