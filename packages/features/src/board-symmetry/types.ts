import type { Square } from "@blindfold-chess/types";

import {
  type BasePracticeSettings,
  type PracticeResultWithMistakes,
  DEFAULT_BASE_PRACTICE_SETTINGS,
} from "../common/types";

/**
 * Which reflection a problem asks for. The names describe the direction the
 * square moves, not the mirror line: `"horizontal"` mirrors the file
 * (a1 ↔ h1, labelled "File symmetry" in the UI), `"vertical"` mirrors the
 * rank (a1 ↔ a8), and `"point"` is the 180° rotation about the centre
 * (a1 ↔ h8).
 */
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
