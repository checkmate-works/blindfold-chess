export type PracticeMode = "timed" | "training" | "rush";

/** `timeLimit` is in seconds. */
export type BasePracticeSettings = {
  timeLimit: number;
  mode: PracticeMode;
};

/**
 * Outcome of one practice session. `accuracy` is a percentage (0–100, not
 * 0–1); `timeTaken` and `averageTime` are seconds, and `timeTaken` is capped
 * at the session's time limit.
 */
export type BasePracticeResult = {
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  timeTaken: number;
  averageTime: number;
};

/** A practice result that also tracks the raw count of wrong answers. */
export type PracticeResultWithMistakes = BasePracticeResult & {
  incorrectAnswers: number;
};

/** Default settings for a standard 60-second timed practice. */
export const DEFAULT_BASE_PRACTICE_SETTINGS: BasePracticeSettings = {
  timeLimit: 60,
  mode: "timed",
};
