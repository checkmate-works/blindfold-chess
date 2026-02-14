export const PIECE_TYPES = [
  "bishop",
  "knight",
  "rook",
  "queen",
  "king",
] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export type MoveQuestion = {
  from: string;
  to: string;
  piece: PieceType;
};

export type LegalMovesSettings = {
  duration: number; // seconds
  selectedPieces: PieceType[];
};

export const DEFAULT_LEGAL_MOVES_SETTINGS: LegalMovesSettings = {
  duration: 60,
  selectedPieces: [...PIECE_TYPES],
};

export type LegalMovesResult = {
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  accuracy: number;
  timeTaken: number;
  averageTime: number;
};
