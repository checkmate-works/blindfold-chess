import type { Square } from "chess.js";

import type { PracticeMode } from "../common/types";

export type { PracticeMode };

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

export type CoordinateQuestion = {
  targetSquare: Square;
  orientation: Exclude<BoardOrientation, "random">;
};

export type QuizSettings = {
  duration: number; // seconds
  orientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
  mode: PracticeMode;
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
  mode: "timed",
};

export type AnswerFeedback = "correct" | "incorrect" | null;
