import type { Square } from "@blindfold-chess/types";

import {
  type BasePracticeSettings,
  type PracticeResultWithMistakes,
  DEFAULT_BASE_PRACTICE_SETTINGS,
} from "../common/types";

export type SymmetryType = "horizontal" | "vertical" | "point";
export const SYMMETRY_TYPES: SymmetryType[] = [
  "horizontal",
  "vertical",
  "point",
];

export type BoardSymmetryProblem = {
  square: Square;
  type: SymmetryType;
};

export type BoardSymmetrySettings = BasePracticeSettings;

export const DEFAULT_BOARD_SYMMETRY_SETTINGS: BoardSymmetrySettings = {
  ...DEFAULT_BASE_PRACTICE_SETTINGS,
};

export type BoardSymmetryResult = PracticeResultWithMistakes;
