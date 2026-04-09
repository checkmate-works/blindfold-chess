'use client';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';

export function BoardThumbnail({ fen }: { fen: string }) {
  const isBlackToMove = fen.split(' ')[1] === 'b';

  return (
    <div className="w-20 h-20">
      <AnimatedChessBoard initialFen={fen} showCoordinates={false} flipped={isBlackToMove} />
    </div>
  );
}
