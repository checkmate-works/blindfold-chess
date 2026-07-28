import type {
  BlindfoldDisplaySettings,
  DisplayablePiece,
  PieceDisplay,
} from "./types";

/**
 * Core blindfold display rule: decides whether a piece is shown, and as what
 * — absent, ghost, Go-stone circle (solid or faint), recolored, or the
 * normal piece.
 *
 * Two independent questions, in this order:
 *
 * 1. **Is it hidden?** — the whole-side gate (`showOwnPieces` /
 *    `showOpponentPieces`) then the partial pawn blindfold (`pawnHideMode`).
 *    In live play a hidden piece is simply `absent`.
 * 2. **What form does it take?** — shape obfuscation (`pieceShapeMode` →
 *    circle) then color obfuscation (`pieceColors` → forced single color).
 *
 * On the review's "As Played" toggle (`hiddenPieceStyle: 'ghost'`) the two
 * compose rather than short-circuit: hiddenness becomes faintness, and the
 * form is still whatever revealing the square would show. A normally-shaped
 * piece is therefore a `ghost` — the true type/colour, so the reviewer sees
 * what was concealed — while a piece the player had set to render as a Go
 * stone stays a stone, just faint. Collapsing the second case to a ghost
 * (as this once did) forced a review of a stone game to choose between
 * looking hidden and looking like the player's board.
 */
export function resolvePieceDisplay(
  piece: DisplayablePiece,
  settings: BlindfoldDisplaySettings,
): PieceDisplay {
  const isOwnPiece = piece.color === settings.ownColor;

  const sideHidden = isOwnPiece
    ? !settings.showOwnPieces
    : !settings.showOpponentPieces;
  const pawnHidden =
    piece.type === "p" &&
    (settings.pawnHideMode === "all" ||
      (settings.pawnHideMode === "own" && isOwnPiece) ||
      (settings.pawnHideMode === "opponent" && !isOwnPiece));
  const hidden = sideHidden || pawnHidden;

  if (hidden && settings.hiddenPieceStyle === "absent")
    return { kind: "absent" };

  let displayColor = piece.color;
  if (settings.pieceColors === "white-only") {
    displayColor = "w";
  } else if (settings.pieceColors === "black-only") {
    displayColor = "b";
  }

  const showAsCircle =
    settings.pieceShapeMode === "circles-all" ||
    (settings.pieceShapeMode === "circles-own" && isOwnPiece) ||
    (settings.pieceShapeMode === "circles-opponent" && !isOwnPiece);
  if (showAsCircle) {
    return hidden
      ? { kind: "circle", color: displayColor, faint: true }
      : { kind: "circle", color: displayColor };
  }

  // A hidden piece with no shape obfuscation to preserve: show the truth,
  // faintly. Deliberately the real colour, not `displayColor` — a recoloured
  // ghost would conceal rather than reveal, which is the opposite of its job.
  if (hidden) return { kind: "ghost", type: piece.type, color: piece.color };

  return { kind: "piece", type: piece.type, color: displayColor };
}

/**
 * True when any blindfold obfuscation is active: pieces shown as discs,
 * forced to a single color, pawns hidden, or a whole side hidden. Decides
 * when illegal-move attempts become possible and worth recording — with
 * normal display, illegal attempts are essentially impossible anyway.
 */
export function isBoardObfuscated(
  settings: Pick<
    BlindfoldDisplaySettings,
    | "pieceShapeMode"
    | "pieceColors"
    | "pawnHideMode"
    | "showOwnPieces"
    | "showOpponentPieces"
  >,
): boolean {
  return (
    settings.pieceShapeMode !== "normal" ||
    settings.pieceColors !== "normal" ||
    settings.pawnHideMode !== "none" ||
    !settings.showOwnPieces ||
    !settings.showOpponentPieces
  );
}

/**
 * Whether showing legal destinations would leak information the player is
 * meant not to have. A strict subset of {@link isBoardObfuscated}: the
 * destination dots reveal a piece's identity only when its *shape* is hidden
 * (stones) or pieces are hidden (a capture ring would expose a hidden
 * opponent). Single-color recolouring keeps every shape intact, so
 * destinations are safe to show there — hence `pieceColors` is excluded.
 */
export function areDestinationsObscured(
  settings: Pick<
    BlindfoldDisplaySettings,
    "pieceShapeMode" | "pawnHideMode" | "showOwnPieces" | "showOpponentPieces"
  >,
): boolean {
  return (
    settings.pieceShapeMode !== "normal" ||
    settings.pawnHideMode !== "none" ||
    !settings.showOwnPieces ||
    !settings.showOpponentPieces
  );
}
