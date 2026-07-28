export type SquareHighlightType =
  | "none"
  | "last-move"
  | "selectable"
  | "selected"
  | "move-dest"
  | "capture-dest"
  /** Where a rejected move was aimed. */
  | "illegal-to"
  /** Where the piece behind a rejected move stood. */
  | "illegal-from";

/**
 * Highlight precedence for one square, mirroring lichess/chessground: the
 * selected square and legal-destination dots / capture rings take precedence
 * over the last-move and external-highlight chrome.
 *
 * The illegal-attempt pair outranks `last-move` because it is shown on
 * demand, in answer to a direct question ("where did this rejected move
 * point?") — leaving the yellow last-move tint to win would silently answer
 * with nothing whenever the attempt happened to aim at one of those two
 * squares, which is exactly the near-miss worth looking at. It stays below
 * the interactive states so it can never mask a live selection.
 */
export function resolveSquareHighlight(flags: {
  isSelected: boolean;
  isCaptureDest: boolean;
  isLegalDestination: boolean;
  isLastMove: boolean;
  isExternalHighlight: boolean;
  isIllegalTo?: boolean;
  isIllegalFrom?: boolean;
}): SquareHighlightType {
  if (flags.isSelected) return "selected";
  if (flags.isCaptureDest) return "capture-dest";
  if (flags.isLegalDestination) return "move-dest";
  if (flags.isIllegalTo) return "illegal-to";
  if (flags.isIllegalFrom) return "illegal-from";
  if (flags.isLastMove) return "last-move";
  if (flags.isExternalHighlight) return "selectable";
  return "none";
}
