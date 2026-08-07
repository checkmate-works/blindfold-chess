import type {
  PawnHideMode,
  PieceColorMode,
  PieceShapeMode,
  PieceType,
} from "@blindfold-chess/types";

// Re-exported so existing importers of `@blindfold-chess/features/board-display`
// keep working; the canonical source (types + runtime arrays) is
// `@blindfold-chess/types`.
export type { PawnHideMode, PieceColorMode, PieceShapeMode };

export type PieceColor = "w" | "b";

/** The minimal piece shape the display rules need (structurally compatible
 * with chess-core's non-null `BoardPiece`). */
export type DisplayablePiece = {
  type: PieceType;
  color: PieceColor;
};

/**
 * How pieces hidden by the blindfold settings are drawn:
 * - `'absent'` — rendered as an empty square (live blindfold play).
 * - `'ghost'` — rendered faintly (the finished-game review's "As Played"
 *   toggle), so a hidden board still *looks* hidden instead of being
 *   indistinguishable from a sighted one.
 *
 * Faintness marks "the player could not see this"; the form underneath is
 * whatever revealing the square would show. So a normally-shaped piece
 * becomes a faint real piece — the reviewer learns what was concealed — and
 * a piece the player had set to render as a Go stone becomes a faint stone,
 * since a stone is what a peek would have put there. Without that second
 * case a stone game's review had to choose between looking hidden and
 * looking like the player's board; it now does both.
 */
export type HiddenPieceStyle = "absent" | "ghost";

/**
 * The blindfold-visibility settings that decide how a piece is displayed.
 * `ownColor` anchors the perspective: "own" always means the player's side,
 * regardless of which side is interactive.
 */
export type BlindfoldDisplaySettings = {
  ownColor: PieceColor;
  showOwnPieces: boolean;
  showOpponentPieces: boolean;
  pieceShapeMode: PieceShapeMode;
  pieceColors: PieceColorMode;
  pawnHideMode: PawnHideMode;
  hiddenPieceStyle: HiddenPieceStyle;
};

/**
 * Renderer-agnostic description of how one piece must be drawn. The board
 * component maps each kind to JSX; the decision itself stays pure and
 * unit-testable.
 */
export type PieceDisplay =
  | { kind: "absent" }
  | { kind: "ghost"; type: PieceType; color: PieceColor }
  /** `faint` = the same stone, drawn as hidden. See {@link HiddenPieceStyle}. */
  | { kind: "circle"; color: PieceColor; faint?: boolean }
  | { kind: "piece"; type: PieceType; color: PieceColor };
