export const PIECE_TYPES = ['bishop', 'knight', 'rook', 'queen', 'king'] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export type MoveQuestion = {
  from: string;
  to: string;
  piece: PieceType;
};
