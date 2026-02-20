export type PracticeMode = "timed" | "training";

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
