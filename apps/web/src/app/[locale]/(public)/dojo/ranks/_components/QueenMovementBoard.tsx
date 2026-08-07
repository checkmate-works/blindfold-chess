import { PieceMovementBoard } from './_shared/PieceMovementBoard';

const QUEEN_SQUARE = 'd4';
const LEGAL_MOVE_SQUARES = [
  // Same rank
  'a4',
  'b4',
  'c4',
  'e4',
  'f4',
  'g4',
  'h4',
  // Same file
  'd1',
  'd2',
  'd3',
  'd5',
  'd6',
  'd7',
  'd8',
  // Diagonals
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

type QueenMovementBoardProps = {
  className?: string;
};

export function QueenMovementBoard({ className }: QueenMovementBoardProps) {
  return (
    <PieceMovementBoard
      pieceSquare={QUEEN_SQUARE}
      pieceType="q"
      legalMoveSquares={LEGAL_MOVE_SQUARES}
      className={className}
    />
  );
}
