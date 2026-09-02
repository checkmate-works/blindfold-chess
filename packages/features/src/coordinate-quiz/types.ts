import type {
  BoardOrientation,
  ResolvedBoardOrientation,
  Square,
} from "@blindfold-chess/types";
import { BOARD_ORIENTATIONS } from "@blindfold-chess/types";

import {
  FEEDBACK_SPEED_MS,
  FEEDBACK_SPEEDS,
  type FeedbackSpeed,
} from "../common/feedback-speed";
import type { BasePracticeResult, BasePracticeSettings } from "../common/types";

// Re-exported so existing importers of `@blindfold-chess/features/coordinate-quiz`
// keep working; the canonical source is `@blindfold-chess/types`.
export { BOARD_ORIENTATIONS };
export type { BoardOrientation };

// Re-exported so existing importers of `@blindfold-chess/features/coordinate-quiz`
// keep working; the canonical source is `@blindfold-chess/features/common`.
export { FEEDBACK_SPEEDS, FEEDBACK_SPEED_MS };
export type { FeedbackSpeed };

export type CoordinateQuestion = {
  targetSquare: Square;
  orientation: ResolvedBoardOrientation;
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
