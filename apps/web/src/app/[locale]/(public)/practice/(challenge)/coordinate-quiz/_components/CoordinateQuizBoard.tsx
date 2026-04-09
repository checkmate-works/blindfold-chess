'use client';

import { ReactNode } from 'react';

import { BoardSkeleton } from '@/app/_components';
import { DISPLAY_RANKS, FILES, isLightSquare } from '@blindfold-chess/features/common';
import type { Square } from '@blindfold-chess/types';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  orientation: 'white' | 'black';
  onSquareClick: (square: Square) => void;
  highlightedSquares?: Record<string, 'correct' | 'incorrect' | 'target'>;
  children?: ReactNode;
};

export function CoordinateQuizBoard({
  orientation,
  onSquareClick,
  highlightedSquares = {},
  children,
}: Props) {
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);
  const files = orientation === 'white' ? FILES : [...FILES].reverse();

  const ranks = orientation === 'white' ? DISPLAY_RANKS : [...DISPLAY_RANKS].reverse();

  const getHighlightColor = (highlight: 'correct' | 'incorrect' | 'target') => {
    switch (highlight) {
      case 'correct':
        return 'bg-green-400 dark:bg-green-600';
      case 'incorrect':
        return 'bg-red-400 dark:bg-red-600';
      case 'target':
        return 'bg-green-500 dark:bg-green-700 ring-2 ring-inset ring-green-600/50 dark:ring-green-800/50';
      default:
        return '';
    }
  };

  if (!isLoaded) {
    return (
      <div className="inline-block w-full max-w-md">
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className="inline-block w-full max-w-md">
      <div className="relative w-full aspect-square border-2 border-border rounded-lg overflow-hidden shadow-lg">
        {ranks.map((rank, rankIndex) => (
          <div key={rank} className="flex h-[12.5%]">
            {files.map((file, fileIndex) => {
              const square = `${file}${rank}` as Square;
              const isLight = isLightSquare(fileIndex, rankIndex);
              const highlight = highlightedSquares[square];
              const highlightColor = highlight ? getHighlightColor(highlight) : '';

              return (
                <button
                  key={square}
                  onClick={() => onSquareClick(square)}
                  className={`
                    w-[12.5%] h-full relative
                    transition-all duration-200
                    hover:brightness-110 active:brightness-90
                    ${highlightColor || (isLight ? themeColors.light : themeColors.dark)}
                  `}
                  aria-label={square}
                ></button>
              );
            })}
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}
