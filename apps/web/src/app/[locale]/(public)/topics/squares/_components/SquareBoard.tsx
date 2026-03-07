'use client';

import { BoardLayout } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { Link } from '@/i18n/routing';

import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';

type Props = {
  locale: string;
  postCounts: Record<string, number>;
};

export function SquareBoard({ locale, postCounts }: Props) {
  const themeColors = getBoardThemeColors(DEFAULT_BOARD_THEME);

  const renderSquare = ({ square, isLight }: SquareRenderInfo) => {
    const postCount = postCounts[square] || 0;

    return (
      <Link
        href={`/topics/squares/${square}`}
        locale={locale}
        className={`flex flex-col items-center justify-center w-full h-full ${
          isLight ? themeColors.lightCoordinates : themeColors.darkCoordinates
        }`}
      >
        <span className="font-medium text-xs sm:text-sm leading-none">{square}</span>
        {postCount > 0 && (
          <span className="text-[10px] leading-none mt-0.5 opacity-70">{postCount}</span>
        )}
      </Link>
    );
  };

  return (
    <div className="max-w-lg mx-auto">
      <BoardLayout
        showCoordinates={false}
        rounded={true}
        themeColors={themeColors}
        renderSquare={renderSquare}
      />
    </div>
  );
}
