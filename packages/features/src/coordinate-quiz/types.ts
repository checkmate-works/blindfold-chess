import type {
  BoardOrientation,
  ResolvedBoardOrientation,
  Square,
} from "@blindfold-chess/types";
import { BOARD_ORIENTATIONS } from "@blindfold-chess/types";

import type { BasePracticeResult, BasePracticeSettings } from "../common/types";

// Re-exported so existing importers of `@blindfold-chess/features/coordinate-quiz`
// keep working; the canonical source is `@blindfold-chess/types`.
export { BOARD_ORIENTATIONS };
export type { BoardOrientation };

export type CoordinateQuestion = {
  targetSquare: Square;
  /** The side the board is drawn from for this question (`"random"` already resolved). */
  orientation: ResolvedBoardOrientation;
};

export type QuizSettings = BasePracticeSettings & {
  orientation: BoardOrientation;
};

export type QuizResult = BasePracticeResult & {
  points: number;
};

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  timeLimit: 60,
  orientation: "white",
  mode: "timed",
};

export type AnswerFeedback = "correct" | "incorrect" | null;
