import type { Square } from "@blindfold-chess/types";

import type { BasePracticeResult, BasePracticeSettings } from "../common/types";

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
  timeLimit: 60,
  mode: "timed",
};

export type BoardSymmetryResult = BasePracticeResult & {
  incorrectAnswers: number;
};
