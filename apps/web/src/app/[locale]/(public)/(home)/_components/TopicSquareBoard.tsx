'use client';

import { useCallback } from 'react';

import { BoardLayout } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  square: string;
};

const renderSquare = () => null;

export function TopicSquareBoard({ square }: Props) {
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  const squareProps = useCallback(
    ({ square: sq }: SquareRenderInfo) => ({
      highlightType: (sq === square ? 'last-move' : 'none') as 'last-move' | 'none',
    }),
    [square]
  );

  if (!isLoaded) {
    return (
      <div className="grid grid-cols-8 rounded-sm overflow-hidden aspect-square w-full animate-pulse">
        {Array.from({ length: 64 }, (_, i) => {
          const isLight = (Math.floor(i / 8) + (i % 8)) % 2 === 0;
          return (
            <div
              key={i}
              className={`aspect-square ${isLight ? 'bg-muted' : 'bg-muted-foreground/30'}`}
            />
          );
        })}
      </div>
    );
  }

  return (
    <BoardLayout
      showCoordinates={false}
      themeColors={themeColors}
      renderSquare={renderSquare}
      squareProps={squareProps}
      rounded={true}
    />
  );
}
