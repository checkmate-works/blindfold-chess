'use client';

import { BoardLayout } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { Link } from '@/i18n/routing';

import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';

type Props = {
  locale: string;
};

export function SquareBoard({ locale }: Props) {
  const themeColors = getBoardThemeColors(DEFAULT_BOARD_THEME);

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

  return (
    <div className="max-w-xs mx-auto">
      <BoardLayout
        showCoordinates={false}
        rounded={true}
        themeColors={themeColors}
        renderSquare={renderSquare}
      />
    </div>
  );
}
