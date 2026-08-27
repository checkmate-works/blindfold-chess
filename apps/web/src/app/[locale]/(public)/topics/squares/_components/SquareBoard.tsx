'use client';

import { BoardFrame, BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { BOARD_RADIUS_EXPAND_ON_MOBILE } from '@/app/_components/chess/BoardFrame';
import { Link } from '@/i18n/routing';

import { getBoardThemeColors } from '@/lib/games/board-themes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  locale: string;
};

export function SquareBoard({ locale }: Props) {
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  const renderSquare = ({ square, isLight }: SquareRenderInfo) => {
    const coordinateClass = isLight ? themeColors.lightCoordinates : themeColors.darkCoordinates;

    return (
      <Link
        href={`/topics/squares/${square}`}
        locale={locale}
        className={`flex flex-col items-center justify-center w-full h-full ${coordinateClass}`}
      >
        <span className="font-medium text-xs sm:text-sm leading-none">{square}</span>
      </Link>
    );
  };

  if (!isLoaded) {
    return (
      <BoardFrame expandOnMobile>
        <BoardSkeleton rounded={BOARD_RADIUS_EXPAND_ON_MOBILE} />
      </BoardFrame>
    );
  }

  return (
    <BoardFrame expandOnMobile>
      <BoardLayout
        showCoordinates={false}
        rounded={true}
        themeColors={themeColors}
        renderSquare={renderSquare}
      />
    </BoardFrame>
  );
}
