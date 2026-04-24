import type { BasePracticeResult } from "./types";

export type StatItem = {
  label: string;
  value: string;
  highlight?: boolean;
};

export type DerivedResultStats = {
  scoreLabel?: string;
  scoreValue: string;
  stats: StatItem[];
};

export type DeriveResultStatsLabels = {
  scoreLabel?: string;
  correctAnswers: string;
  accuracy: string;
  timeTaken: string;
  averageTime: string;
};

/**
 * Computes a practice result from raw session data.
 * Pure function — no side effects, no dependency on Date.now().
 */
export function computePracticeResult(
  correctCount: number,
  incorrectCount: number,
  elapsedSeconds: number,
  timeLimit: number,
  questionTimes: number[],
): BasePracticeResult & { incorrectAnswers: number } {
  const totalQuestions = correctCount + incorrectCount;
  const accuracy =
    totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const averageTime =
    questionTimes.length > 0
      ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length
      : 0;

  return {
    correctAnswers: correctCount,
    incorrectAnswers: incorrectCount,
    totalQuestions,
    accuracy,
    timeTaken: Math.min(elapsedSeconds, timeLimit),
    averageTime,
  };
}

/**
 * Derives presentation-ready stats from a BasePracticeResult.
 * Pure function — caller supplies translated label strings; no i18n dependency.
 */
export function deriveResultStats(
  result: BasePracticeResult,
  labels: DeriveResultStatsLabels,
): DerivedResultStats {
  return {
    scoreLabel: labels.scoreLabel,
    scoreValue: `${result.correctAnswers} / ${result.totalQuestions}`,
    stats: [
      {
        label: labels.correctAnswers,
        value: result.correctAnswers.toString(),
        highlight: true,
      },
      {
        label: labels.accuracy,
        value: `${result.accuracy.toFixed(1)}%`,
      },
      {
        label: labels.timeTaken,
        value: `${result.timeTaken}s`,
      },
      {
        label: labels.averageTime,
        value: `${result.averageTime.toFixed(1)}s`,
      },
    ],
  };
}
