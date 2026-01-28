export const BOARD_ORIENTATIONS = ["white", "black", "random"] as const;
export type BoardOrientation = (typeof BOARD_ORIENTATIONS)[number];

export const FEEDBACK_SPEEDS = ["fast", "normal", "slow"] as const;
export type FeedbackSpeed = (typeof FEEDBACK_SPEEDS)[number];

// Feedback speed to milliseconds mapping
export const FEEDBACK_SPEED_MS: Record<FeedbackSpeed, number> = {
  fast: 300,
  normal: 600,
  slow: 900,
};

// Square type (a1-h8)
export type Square =
  | "a1"
  | "a2"
  | "a3"
  | "a4"
  | "a5"
  | "a6"
  | "a7"
  | "a8"
  | "b1"
  | "b2"
  | "b3"
  | "b4"
  | "b5"
  | "b6"
  | "b7"
  | "b8"
  | "c1"
  | "c2"
  | "c3"
  | "c4"
  | "c5"
  | "c6"
  | "c7"
  | "c8"
  | "d1"
  | "d2"
  | "d3"
  | "d4"
  | "d5"
  | "d6"
  | "d7"
  | "d8"
  | "e1"
  | "e2"
  | "e3"
  | "e4"
  | "e5"
  | "e6"
  | "e7"
  | "e8"
  | "f1"
  | "f2"
  | "f3"
  | "f4"
  | "f5"
  | "f6"
  | "f7"
  | "f8"
  | "g1"
  | "g2"
  | "g3"
  | "g4"
  | "g5"
  | "g6"
  | "g7"
  | "g8"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "h7"
  | "h8";

export type CoordinateQuestion = {
  targetSquare: Square;
  orientation: Exclude<BoardOrientation, "random">;
};

export type QuizSettings = {
  duration: number; // seconds
  orientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
};

export type QuizResult = {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  points: number;
  timeTaken: number;
};

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  duration: 60,
  orientation: "white",
  feedbackSpeed: "normal",
};

export type AnswerFeedback = "correct" | "incorrect" | null;
