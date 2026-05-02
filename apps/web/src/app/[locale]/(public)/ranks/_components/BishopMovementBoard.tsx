'use client';

import { PieceMovementBoard } from './_shared/PieceMovementBoard';

const BISHOP_SQUARE = 'd4';
const LEGAL_MOVE_SQUARES = [
  'a1',
  'b2',
  'c3',
  'e5',
  'f6',
  'g7',
  'h8',
  'a7',
  'b6',
  'c5',
  'e3',
  'f2',
  'g1',
];

type BishopMovementBoardProps = {
  className?: string;
};

export function BishopMovementBoard({ className }: BishopMovementBoardProps) {
  return (
    <PieceMovementBoard
      pieceSquare={BISHOP_SQUARE}
      pieceType="b"
      legalMoveSquares={LEGAL_MOVE_SQUARES}
      className={className}
    />
  );
}
