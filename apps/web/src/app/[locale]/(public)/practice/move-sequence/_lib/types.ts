import type { ParsedMoveSequence } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

export type {
  ParsedMoveSequence,
  ParsedPgnMove as ParsedMove,
} from '@blindfold-chess/features/chess-core';

export type MoveSequencePhase = 'setup' | 'memorize' | 'recall' | 'result';

export type MoveSequenceSettings = {
  fen: string;
  pgn: string;
  includeOpponentMoves: boolean;
};

export type MoveSequenceData = ParsedMoveSequence & {
  includeOpponentMoves: boolean;
};

export type RecallResult = {
  expectedMove: AlgebraicNotation;
  userMove: AlgebraicNotation | null;
  isCorrect: boolean;
  attempts: number;
  wrongAttempts: AlgebraicNotation[];
};

export type MoveSequenceSessionResult = {
  totalMoves: number;
  correctMoves: number;
  accuracy: number;
  results: RecallResult[];
};
