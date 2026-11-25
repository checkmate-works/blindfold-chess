import type { BasePracticeResult, PracticeResultWithMistakes } from "./types";

export type StatItem = {
  label: string;
  value: string;
  highlight?: boolean;
};

/** Which of the four standard result stats a `ResultStat` is. */
export type ResultStatKey =
  "correctAnswers" | "accuracy" | "timeTaken" | "averageTime";

/**
 * A standard result stat, tagged with what it measures. The label is the
 * caller's translated string and may be overridden per module (a module
 * renames "time taken"), so a caller that leaves a stat out must pick it by
 * `key`; matching the label breaks as soon as two stats share a wording or
 * one of them is renamed.
 */
export type ResultStat = StatItem & { key: ResultStatKey };

export type DerivedResultStats = {
  scoreLabel?: string;
  scoreValue: string;
  stats: ResultStat[];
};

export type DeriveResultStatsLabels = {
  scoreLabel?: string;
  correctAnswers: string;
  accuracy: string;
  timeTaken: string;
  averageTime: string;
};

/** Calculate the percentage of correct answers, treating an empty set as 0%. */
export function calculateAnswerAccuracy(
  correct: number,
  total: number,
): number {
  return total > 0 ? (correct / total) * 100 : 0;
}

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
): PracticeResultWithMistakes {
  const totalQuestions = correctCount + incorrectCount;
  const accuracy = calculateAnswerAccuracy(correctCount, totalQuestions);
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
        key: "correctAnswers",
        label: labels.correctAnswers,
        value: result.correctAnswers.toString(),
        highlight: true,
      },
      {
        key: "accuracy",
        label: labels.accuracy,
        value: `${result.accuracy.toFixed(1)}%`,
      },
      {
        key: "timeTaken",
        label: labels.timeTaken,
        value: `${result.timeTaken}s`,
      },
      {
        key: "averageTime",
        label: labels.averageTime,
        value: `${result.averageTime.toFixed(1)}s`,
      },
    ],
  };
}
