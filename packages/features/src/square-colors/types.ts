export type SquareColor = "light" | "dark";

export type SquareColorsSettings = {
  timeLimit: number;
};

export const DEFAULT_SQUARE_COLORS_SETTINGS: SquareColorsSettings = {
  timeLimit: 60,
};

export type SquareColorsResult = {
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  accuracy: number;
  timeTaken: number;
  averageTime: number;
};
