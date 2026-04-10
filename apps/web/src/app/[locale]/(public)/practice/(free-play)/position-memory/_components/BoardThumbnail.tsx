'use client';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';

type Props = {
  fen: string;
  className?: string;
};

export function BoardThumbnail({ fen, className = 'w-20 h-20 sm:w-24 sm:h-24' }: Props) {
  const isBlackToMove = fen.split(' ')[1] === 'b';

  return (
    <div className={className}>
      <AnimatedChessBoard initialFen={fen} showCoordinates={false} flipped={isBlackToMove} />
    </div>
  );
}
