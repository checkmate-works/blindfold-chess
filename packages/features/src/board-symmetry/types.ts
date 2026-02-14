export type SymmetryType = "horizontal" | "vertical" | "point";
export const SYMMETRY_TYPES: SymmetryType[] = [
  "horizontal",
  "vertical",
  "point",
];

export type BoardSymmetryProblem = {
  square: string;
  type: SymmetryType;
};

export type BoardSymmetrySettings = {
  timeLimit: number;
};

export const DEFAULT_BOARD_SYMMETRY_SETTINGS: BoardSymmetrySettings = {
  timeLimit: 60,
};

export type BoardSymmetryResult = {
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  accuracy: number;
  timeTaken: number;
  averageTime: number;
};
