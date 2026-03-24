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
  const { preferences } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  const squareProps = useCallback(
    ({ square: sq }: SquareRenderInfo) => ({
      highlightType: (sq === square ? 'last-move' : 'none') as 'last-move' | 'none',
    }),
    [square]
  );

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
