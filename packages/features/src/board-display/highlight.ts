export type SquareHighlightType =
  | "none"
  | "last-move"
  | "selectable"
  | "selected"
  | "move-dest"
  | "capture-dest";

/**
 * Highlight precedence for one square, mirroring lichess/chessground: the
 * selected square and legal-destination dots / capture rings take precedence
 * over the last-move and external-highlight chrome.
 */
export function resolveSquareHighlight(flags: {
  isSelected: boolean;
  isCaptureDest: boolean;
  isLegalDestination: boolean;
  isLastMove: boolean;
  isExternalHighlight: boolean;
}): SquareHighlightType {
  if (flags.isSelected) return "selected";
  if (flags.isCaptureDest) return "capture-dest";
  if (flags.isLegalDestination) return "move-dest";
  if (flags.isLastMove) return "last-move";
  if (flags.isExternalHighlight) return "selectable";
  return "none";
}
