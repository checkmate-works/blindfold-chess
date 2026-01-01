import type { AlgebraicNotation } from '@/lib/types';

export type MoveSequencePhase = 'setup' | 'memorize' | 'recall' | 'result';

export type MoveSequenceSettings = {
  fen: string;
  pgn: string;
};

export type ParsedMove = {
  moveNumber: number;
  white: AlgebraicNotation | null;
  black: AlgebraicNotation | null;
};

export type MoveSequenceData = {
  fen: string;
  moves: AlgebraicNotation[];
  playerColor: 'w' | 'b';
};

export type RecallResult = {
  expectedMove: AlgebraicNotation;
  userMove: AlgebraicNotation | null;
  isCorrect: boolean;
  attempts: number;
};

export type MoveSequenceSessionResult = {
  totalMoves: number;
  correctMoves: number;
  accuracy: number;
  results: RecallResult[];
};
