import type { Square } from "@blindfold-chess/types";

import {
  type BasePracticeSettings,
  type PracticeResultWithMistakes,
  DEFAULT_BASE_PRACTICE_SETTINGS,
} from "../common/types";

/**
 * The two diagonals through a square, each written as its two end squares
 * joined by `-`, lower file first. A diagonal that is a single corner square
 * (e.g. the a1-h8 diagonal through h1) is just that square, with no hyphen.
 */
export type DiagonalPair = {
  /** SW-NE direction (a1-h8 direction), e.g. `"b1-h7"`. */
  diagonal: string;
  /** SE-NW direction (h1-a8 direction), e.g. `"b7-h1"`. */
  antiDiagonal: string;
};

export type DiagonalQuizSettings = BasePracticeSettings;

export const DEFAULT_DIAGONAL_QUIZ_SETTINGS: DiagonalQuizSettings = {
  ...DEFAULT_BASE_PRACTICE_SETTINGS,
};

export type DiagonalQuestionResult = {
  square: Square;
  isCorrect: boolean;
  isDiagonalCorrect: boolean;
  isAntiDiagonalCorrect: boolean;
  correctDiagonal: string;
  correctAntiDiagonal: string;
  userDiagonal?: string;
  userAntiDiagonal?: string;
  /**
   * The question that was on screen when the time limit hit. It carries the
   * correct diagonals so the result screen can show the answer, but no user
   * answers, and it is not part of the score: `isCorrect` is false only
   * because nothing was answered, and the session's incorrect count does not
   * include it.
   */
  timedOut?: true;
};

export type DiagonalQuizResult = PracticeResultWithMistakes;
