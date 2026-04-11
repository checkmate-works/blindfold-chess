'use client';

import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core';

import type { BoardTheme } from '@/lib/boardThemes';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';

type Props = {
  fen: string;
  className?: string;
  boardTheme?: BoardTheme;
};

export function BoardThumbnail({
  fen,
  className = 'w-20 h-20 sm:w-24 sm:h-24',
  boardTheme,
}: Props) {
  const isBlackToMove = isBlackToMoveFromFen(fen);

  return (
    <div className={className}>
      <AnimatedChessBoard
        initialFen={fen}
        showCoordinates={false}
        flipped={isBlackToMove}
        boardTheme={boardTheme}
      />
    </div>
  );
}
