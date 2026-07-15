'use client';

import { useCallback } from 'react';

import { BoardFrame, BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { Link } from '@/i18n/routing';

import { getBoardThemeColors } from '@/lib/games/board-themes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  square: string;
  locale: string;
  disableLinks?: boolean;
};

export function SquareHighlightBoard({ square, locale, disableLinks = false }: Props) {
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  const renderSquare = useCallback(
    ({ square: sq }: SquareRenderInfo) => {
      if (sq === square || disableLinks) {
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
    [square, locale, disableLinks]
  );

  const squareProps = useCallback(
    ({ square: sq }: SquareRenderInfo) => ({
      highlightType: (sq === square ? 'last-move' : 'none') as 'last-move' | 'none',
    }),
    [square]
  );

  if (!isLoaded) {
    return (
      <BoardFrame expandOnMobile>
        <BoardSkeleton />
      </BoardFrame>
    );
  }

  return (
    <BoardFrame expandOnMobile>
      <BoardLayout
        showCoordinates={preferences.showCoordinates}
        themeColors={themeColors}
        renderSquare={renderSquare}
        squareProps={squareProps}
      />
    </BoardFrame>
  );
}
