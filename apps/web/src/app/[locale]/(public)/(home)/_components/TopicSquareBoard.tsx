'use client';

import { useCallback } from 'react';

import { BoardLayout } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';

import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';

type Props = {
  square: string;
};

const themeColors = getBoardThemeColors(DEFAULT_BOARD_THEME);

const renderSquare = () => null;

export function TopicSquareBoard({ square }: Props) {
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
