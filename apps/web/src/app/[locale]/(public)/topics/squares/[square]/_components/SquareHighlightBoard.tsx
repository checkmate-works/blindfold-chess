'use client';

import { useCallback } from 'react';

import { BoardLayout } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  square: string;
};

export function SquareHighlightBoard({ square }: Props) {
  const { preferences } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  const renderSquare = useCallback(() => null, []);

  const squareProps = useCallback(
    ({ square: sq }: SquareRenderInfo) => ({
      highlightType: (sq === square ? 'last-move' : 'none') as 'last-move' | 'none',
    }),
    [square]
  );

  return (
    <div className="max-w-xs mx-auto">
      <BoardLayout
        showCoordinates={preferences.showCoordinates}
        themeColors={themeColors}
        renderSquare={renderSquare}
        squareProps={squareProps}
      />
    </div>
  );
}
