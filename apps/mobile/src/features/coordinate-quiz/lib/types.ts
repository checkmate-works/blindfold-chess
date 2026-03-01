export {
  BOARD_ORIENTATIONS,
  FEEDBACK_SPEEDS,
  FEEDBACK_SPEED_MS,
  DEFAULT_QUIZ_SETTINGS,
} from "@blindfold-chess/features/coordinate-quiz";

export type {
  BoardOrientation,
  FeedbackSpeed,
  CoordinateQuestion,
  QuizSettings,
  QuizResult,
  AnswerFeedback,
} from "@blindfold-chess/features/coordinate-quiz";

// Re-export Square for consumers that imported it from here
export type { Square } from "@blindfold-chess/types";
