import type { PracticeMode } from "../common/types";

export type SquareColor = "light" | "dark";

export type { PracticeMode };

export type SquareColorsSettings = {
  timeLimit: number;
  mode: PracticeMode;
};

export const DEFAULT_SQUARE_COLORS_SETTINGS: SquareColorsSettings = {
  timeLimit: 60,
  mode: "timed",
};

export type SquareColorsResult = {
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  accuracy: number;
  timeTaken: number;
  averageTime: number;
};
