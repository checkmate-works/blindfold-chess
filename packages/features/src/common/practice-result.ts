import type { BasePracticeResult } from "./types";

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
