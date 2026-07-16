import type { PracticeResultWithMistakes } from "@blindfold-chess/features/common";

/**
 * The stringified search params every stats-based practice result screen
 * receives from its session screen's `router.replace`.
 */
export type PracticeStatsParams = {
  correctAnswers?: string;
  incorrectAnswers?: string;
  totalQuestions?: string;
  accuracy?: string;
  timeTaken?: string;
  averageTime?: string;
};

/**
 * Parses the stringified result params back into numbers, defaulting every
 * missing field to 0 (a direct deep-link with no params renders an empty
 * result rather than NaN).
 */
export function parsePracticeStatsParams(
  params: PracticeStatsParams,
): PracticeResultWithMistakes {
  return {
    correctAnswers: parseInt(params.correctAnswers || "0", 10),
    incorrectAnswers: parseInt(params.incorrectAnswers || "0", 10),
    totalQuestions: parseInt(params.totalQuestions || "0", 10),
    accuracy: parseFloat(params.accuracy || "0"),
    timeTaken: parseInt(params.timeTaken || "0", 10),
    averageTime: parseFloat(params.averageTime || "0"),
  };
}
