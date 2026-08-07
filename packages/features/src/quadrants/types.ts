import type { BoardOrientation, Square } from "@blindfold-chess/types";

// Re-exported so existing importers of `@blindfold-chess/features/quadrants`
// keep working; the canonical source is `@blindfold-chess/types`.
export type { BoardOrientation };

export type QuadrantId = "q1" | "q2" | "q3" | "q4";

export type QuadrantQuestion = {
  square: Square;
  orientation: "white" | "black";
};
