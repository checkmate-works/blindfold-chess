import {
  type BasePracticeSettings,
  type PracticeResultWithMistakes,
  DEFAULT_BASE_PRACTICE_SETTINGS,
} from "../common/types";

export type SquareColor = "light" | "dark";

export type SquareColorsSettings = BasePracticeSettings;

export const DEFAULT_SQUARE_COLORS_SETTINGS: SquareColorsSettings = {
  ...DEFAULT_BASE_PRACTICE_SETTINGS,
};

export type SquareColorsResult = PracticeResultWithMistakes;
