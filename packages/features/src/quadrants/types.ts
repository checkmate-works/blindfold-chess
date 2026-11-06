import type {
  BoardOrientation,
  ResolvedBoardOrientation,
  Square,
} from "@blindfold-chess/types";

import type { PracticeResultWithMistakes } from "../common/types";

// Re-exported so existing importers of `@blindfold-chess/features/quadrants`
// keep working; the canonical source is `@blindfold-chess/types`.
export type { BoardOrientation };

/**
 * Board quadrants numbered like the Cartesian plane, as seen from white:
 * `q1` = e5–h8 (top right), `q2` = a5–d8, `q3` = a1–d4, `q4` = e1–h4.
 */
export type QuadrantId = "q1" | "q2" | "q3" | "q4";

export type VisualQuadrant =
  "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type QuadrantQuestion = {
  square: Square;
  orientation: ResolvedBoardOrientation;
};

/**
 * The player's choices for a quadrants run. Only the board orientation is a
 * setting: the timed run's length and mistake allowance are fixed rules of
 * the mode, passed to the session hook by each app.
 */
export type QuadrantsSettings = {
  orientation: BoardOrientation;
};

export const DEFAULT_QUADRANTS_SETTINGS: QuadrantsSettings = {
  orientation: "white",
};

export type QuadrantsResult = PracticeResultWithMistakes;
