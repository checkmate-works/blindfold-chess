export type DiagonalPair = {
  diagonal: string; // SW-NE direction (a1-h8 direction), e.g., "b1-h7"
  antiDiagonal: string; // SE-NW direction (h1-a8 direction), e.g., "b7-h1"
};

export type DiagonalQuizSettings = {
  timeLimit: number;
};

export const DEFAULT_DIAGONAL_QUIZ_SETTINGS: DiagonalQuizSettings = {
  timeLimit: 60,
};

export type DiagonalQuestionResult = {
  square: string;
  isCorrect: boolean;
  isDiagonalCorrect: boolean;
  isAntiDiagonalCorrect: boolean;
  correctDiagonal: string;
  correctAntiDiagonal: string;
  userDiagonal?: string;
  userAntiDiagonal?: string;
};

export type DiagonalQuizResult = {
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  accuracy: number;
  timeTaken: number;
  averageTime: number;
};
