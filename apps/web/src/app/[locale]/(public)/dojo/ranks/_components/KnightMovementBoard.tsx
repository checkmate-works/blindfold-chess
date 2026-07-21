'use client';

import { PieceMovementBoard } from './_shared/PieceMovementBoard';

const KNIGHT_SQUARE = 'd4';
const LEGAL_MOVE_SQUARES = ['c2', 'c6', 'b3', 'b5', 'e2', 'e6', 'f3', 'f5'];

type KnightMovementBoardProps = {
  className?: string;
};

export function KnightMovementBoard({ className }: KnightMovementBoardProps) {
  return (
    <PieceMovementBoard
      pieceSquare={KNIGHT_SQUARE}
      pieceType="n"
      legalMoveSquares={LEGAL_MOVE_SQUARES}
      className={className}
    />
  );
}
