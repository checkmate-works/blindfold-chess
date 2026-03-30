'use client';

import { isLightSquare } from '@blindfold-chess/features/common';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

const FILES = ['a', 'b', 'c', 'd'];
const RANKS = ['8', '7', '6', '5'];

// Highlighted squares: the 4 corners of the quadrant
const HIGHLIGHT_SQUARES = ['a8', 'd8', 'a5', 'd5'];

export function SymmetryBoard() {
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
        {/* Board squares */}
        {RANKS.map((rank, rankDisplayIndex) => {
          const actualRankIndex = rankDisplayIndex;
          return (
            <div key={rank} className="flex h-[25%]">
              {FILES.map((file, fileDisplayIndex) => {
                const actualFileIndex = fileDisplayIndex;
                const square = `${file}${rank}`;
                const isLight = isLightSquare(actualFileIndex, actualRankIndex);
                const isHighlighted = HIGHLIGHT_SQUARES.includes(square);
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

        {/* SVG Overlay with symmetry arrows */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="arrowhead-rose"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" className="fill-rose-500" />
            </marker>
            <marker
              id="arrowhead-blue"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" className="fill-blue-500" />
            </marker>
            <marker
              id="arrowhead-emerald"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" className="fill-emerald-500" />
            </marker>
          </defs>
          {/* Arrow from a8 (center of top-left square: 12.5, 12.5) to d5 (center of bottom-right square: 87.5, 87.5) */}
          {/* In a 4x4 grid, each square is 25%. Centers: col0=12.5, col1=37.5, col2=62.5, col3=87.5 */}
          <line
            x1="12.5"
            y1="12.5"
            x2="82"
            y2="82"
            stroke="currentColor"
            strokeWidth="2"
            className="text-rose-500"
            markerEnd="url(#arrowhead-rose)"
          />
          {/* Arrow from a8 to d8 (top-right) */}
          <line
            x1="12.5"
            y1="12.5"
            x2="82"
            y2="12.5"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-blue-500"
            markerEnd="url(#arrowhead-blue)"
            strokeDasharray="4 2"
          />
          {/* Arrow from a8 to a5 (bottom-left) */}
          <line
            x1="12.5"
            y1="12.5"
            x2="12.5"
            y2="82"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-emerald-500"
            markerEnd="url(#arrowhead-emerald)"
            strokeDasharray="4 2"
          />
        </svg>
      </div>
    </div>
  );
}
