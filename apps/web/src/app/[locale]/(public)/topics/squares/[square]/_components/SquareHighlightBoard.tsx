'use client';

import { useCallback } from 'react';

import { BoardLayout } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { Link } from '@/i18n/routing';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  square: string;
  locale: string;
};

export function SquareHighlightBoard({ square, locale }: Props) {
  const { preferences } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  const renderSquare = useCallback(
    ({ square: sq }: SquareRenderInfo) => {
      if (sq === square) {
        return null;
      }

      return (
        <Link
          href={`/topics/squares/${sq}`}
          locale={locale}
          className="block w-full h-full cursor-pointer"
          aria-label={sq}
        />
      );
    },
    [square, locale]
  );

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
