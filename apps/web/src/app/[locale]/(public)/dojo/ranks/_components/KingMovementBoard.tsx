'use client';

import { PieceMovementBoard } from './_shared/PieceMovementBoard';

const KING_SQUARE = 'd4';
const LEGAL_MOVE_SQUARES = ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'];

type KingMovementBoardProps = {
  className?: string;
};

export function KingMovementBoard({ className }: KingMovementBoardProps) {
  return (
    <PieceMovementBoard
      pieceSquare={KING_SQUARE}
      pieceType="k"
      legalMoveSquares={LEGAL_MOVE_SQUARES}
      className={className}
    />
  );
}
