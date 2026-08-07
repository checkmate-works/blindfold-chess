import { PieceMovementBoard } from './_shared/PieceMovementBoard';

const ROOK_SQUARE = 'd4';
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
];

type RookMovementBoardProps = {
  className?: string;
};

export function RookMovementBoard({ className }: RookMovementBoardProps) {
  return (
    <PieceMovementBoard
      pieceSquare={ROOK_SQUARE}
      pieceType="r"
      legalMoveSquares={LEGAL_MOVE_SQUARES}
      className={className}
    />
  );
}
