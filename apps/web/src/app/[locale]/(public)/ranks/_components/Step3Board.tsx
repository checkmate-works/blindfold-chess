'use client';

import { isLightSquare } from '@blindfold-chess/features/common';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

const FILES = ['e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5'];
const FILE_OFFSET = 4;
const RANK_OFFSET = 0;

export function Step3Board() {
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-xs sm:max-w-sm">
        <div className="aspect-square w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  // In 4x4 grid: e5 is at (0, 3) = bottom-left. f6 is at (1, 2).
  // Centers in %: col0=12.5, col1=37.5, col2=62.5, col3=87.5
  // e5 center: (12.5, 87.5)
  // f6 center: (37.5, 62.5)

  return (
    <div className="mx-auto max-w-xs sm:max-w-sm">
      <div className="relative w-full aspect-square border border-border overflow-hidden rounded-md shadow-lg">
        {RANKS.map((rank, rankDisplayIndex) => {
          const actualRankIndex = rankDisplayIndex + RANK_OFFSET;
          return (
            <div key={rank} className="flex h-[25%]">
              {FILES.map((file, fileDisplayIndex) => {
                const actualFileIndex = fileDisplayIndex + FILE_OFFSET;
                const square = `${file}${rank}`;
                const isLight = isLightSquare(actualFileIndex, actualRankIndex);
                const isHighlighted = square === 'e5';
                const coordinateColorClass = isLight
                  ? themeColors.lightCoordinates
                  : themeColors.darkCoordinates;
                const squareColorClass = isLight ? themeColors.light : themeColors.dark;
                const highlightClass = isHighlighted ? 'ring-2 ring-yellow-400 ring-inset' : '';

                return (
                  <div
                    key={file}
                    className={`w-[25%] h-full relative flex items-center justify-center ${squareColorClass} ${highlightClass}`}
                  >
                    {preferences.showCoordinates && fileDisplayIndex === 0 && (
                      <div
                        className={`absolute left-0.5 top-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${coordinateColorClass}`}
                      >
                        {rank}
                      </div>
                    )}
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

        {/* SVG arrow from e5 to f6 - same style as SymmetryBoard */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="step3-arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" className="fill-rose-500" />
            </marker>
          </defs>
          {/* e5 center: (12.5, 87.5), f6 center: (37.5, 62.5) */}
          <line
            x1="12.5"
            y1="87.5"
            x2="32"
            y2="68"
            stroke="currentColor"
            strokeWidth="2"
            className="text-rose-500"
            markerEnd="url(#step3-arrowhead)"
          />
        </svg>
      </div>
    </div>
  );
}
