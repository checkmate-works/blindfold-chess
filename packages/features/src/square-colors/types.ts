import type { BasePracticeResult, BasePracticeSettings } from "../common/types";

export type SquareColor = "light" | "dark";

export type SquareColorsSettings = BasePracticeSettings;

export const DEFAULT_SQUARE_COLORS_SETTINGS: SquareColorsSettings = {
  timeLimit: 60,
  mode: "timed",
};

export type SquareColorsResult = BasePracticeResult & {
  incorrectAnswers: number;
};
