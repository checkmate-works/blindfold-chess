import type {
  BlindfoldDisplaySettings,
  DisplayablePiece,
  PieceDisplay,
} from "./types";

/**
 * Core blindfold display rule: decides whether a piece is shown, and as what
 * — absent, ghost, Go-stone circle, recolored, or the normal piece.
 *
 * Rule order (each step may terminate with the hidden rendering):
 * 1. Whole-side visibility (`showOwnPieces` / `showOpponentPieces`).
 * 2. Partial pawn blindfold (`pawnHideMode`) — runs after the whole-side
 *    gate (a hidden side is already gone) and before the shape/color
 *    transforms (a hidden pawn renders nothing at all).
 * 3. Shape obfuscation (`pieceShapeMode` → circle).
 * 4. Color obfuscation (`pieceColors` → forced single color).
 *
 * The hidden rendering is `absent` in live play or `ghost` on the review's
 * "As Played" toggle; a ghost deliberately shows the real type/colour (no
 * shape/colour obfuscation) so the reviewer sees what was concealed.
 */
export function resolvePieceDisplay(
  piece: DisplayablePiece,
  settings: BlindfoldDisplaySettings,
): PieceDisplay {
  const hidden: PieceDisplay =
    settings.hiddenPieceStyle === "ghost"
      ? { kind: "ghost", type: piece.type, color: piece.color }
      : { kind: "absent" };

  const isOwnPiece = piece.color === settings.ownColor;
  if (isOwnPiece && !settings.showOwnPieces) return hidden;
  if (!isOwnPiece && !settings.showOpponentPieces) return hidden;

  if (piece.type === "p") {
    const hidePawn =
      settings.pawnHideMode === "all" ||
      (settings.pawnHideMode === "own" && isOwnPiece) ||
      (settings.pawnHideMode === "opponent" && !isOwnPiece);
    if (hidePawn) return hidden;
  }

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
    return { kind: "circle", color: displayColor };
  }

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
