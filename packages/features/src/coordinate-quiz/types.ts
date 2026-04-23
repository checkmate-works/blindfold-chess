import type { Square } from "@blindfold-chess/types";
import {
  BOARD_ORIENTATIONS,
  type BoardOrientation,
} from "@blindfold-chess/types";

import type { BasePracticeResult, BasePracticeSettings } from "../common/types";

// Re-exported so existing importers of `@blindfold-chess/features/coordinate-quiz`
// keep working; the canonical source is `@blindfold-chess/types`.
export { BOARD_ORIENTATIONS };
export type { BoardOrientation };

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

export type QuizSettings = BasePracticeSettings & {
  orientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
};

export type QuizResult = BasePracticeResult & {
  points: number;
};

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  timeLimit: 60,
  orientation: "white",
  feedbackSpeed: "normal",
  mode: "timed",
};

export type AnswerFeedback = "correct" | "incorrect" | null;
