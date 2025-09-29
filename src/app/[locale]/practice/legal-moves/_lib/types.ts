export type PieceType = 'bishop' | 'knight' | 'rook' | 'queen' | 'king';

export type MoveQuestion = {
  from: string;
  to: string;
  piece: PieceType;
};
