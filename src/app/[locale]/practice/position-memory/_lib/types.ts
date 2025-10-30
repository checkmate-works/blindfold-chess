export type GamePhase = 'memorize' | 'recreate' | 'result';

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
  extraPieces: number;
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
