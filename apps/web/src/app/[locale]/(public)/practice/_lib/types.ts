/**
 * Common game state for practice modules
 */
export type GameState = 'setup' | 'playing' | 'finished';

/**
 * Shared types for position-based practice modules
 */
export type ScoreDetail = {
  square: string;
  expected: string;
  actual: string;
  score: number;
  description: string;
};

export type PositionAccuracy = {
  correctPieces: number;
  totalPieces: number;
  incorrectPieces: number; // incorrect: a piece from the original position, but placed with a different piece type
  missingPieces: number; // missing: a piece that should be placed but is omitted
  extraPieces: number; // extra: a piece placed on a square that should remain empty
  netScore: number;
  accuracy: number;
  details: ScoreDetail[];
};

export type PositionData = {
  fen: string;
  isBlackToMove: boolean;
};

export type SquareStatus = 'correct' | 'incorrect' | 'missing';

export type SquareDiff = {
  square: string;
  status: SquareStatus;
};
