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
  incorrectPieces: number; // 誤答: 元の配置にある駒だが違う駒を置いた
  missingPieces: number; // 漏れ: 置き忘れた駒
  extraPieces: number; // 余分: 元の配置にない場所に置いた駒
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
