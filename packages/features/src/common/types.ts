export type PracticeMode = "timed" | "training" | "rush";

export type BasePracticeSettings = {
  timeLimit: number;
  mode: PracticeMode;
};

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
