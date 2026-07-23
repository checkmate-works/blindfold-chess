import type { PieceType } from "@blindfold-chess/types";

/**
 * Render a best-effort SAN-like label for an *illegal* board move attempt
 * (a drag-drop, or a click-to-move after a piece was selected). An illegal
 * move has no canonical SAN — chess.js will not produce one — so this
 * assembles a SAN-shaped string from the moved piece and the target square
 * alone. It is deliberately notation-*like*, not verified SAN:
 *
 * - No check / checkmate suffix and no promotion suffix: an illegal attempt
 *   has no engine result to derive them from.
 * - No disambiguation (`Nbd2`): the move is illegal, so a same-type sibling
 *   that could "also" reach the square is moot — the label only needs to read
 *   as "the player tried to play a knight to d2".
 * - The capture `x` marks that the destination was occupied, even when the
 *   occupant is the mover's own piece: capturing one's own piece is one of the
 *   illegal attempts this records, and the `x` still communicates "tried to
 *   land on an occupied square".
 *
 * The output matches the text-input SAN style (`Nf3`, `exd5`) so board and
 * typed illegal attempts render uniformly in the per-move review UI. Only the
 * bare payload-less first-tap mis-grab (no destination) has no SAN-like form
 * and is handled separately by the caller.
 */
export function describeIllegalAttempt(params: {
  from: string;
  to: string;
  /** Piece type on the `from` square, or `null` when it is unknown / empty. */
  moverType: PieceType | null;
  /** Whether the `to` square was occupied (renders the capture `x`). */
  targetOccupied: boolean;
}): string {
  const { from, to, moverType, targetOccupied } = params;

  // No known mover (should not happen once a piece has been selected, but keep
  // a safe fallback): drop to plain coordinate long-notation.
  if (moverType === null) return `${from}-${to}`;

  if (moverType === "p") {
    // A pawn capture is diagonal — the file changes. Render `exd5`; a straight
    // (same-file) illegal push renders as the bare destination `d5`.
    const fromFile = from[0];
    const toFile = to[0];
    if (fromFile !== toFile) return `${fromFile}x${to}`;
    return to;
  }

  // n->N, b->B, r->R, q->Q, k->K
  const letter = moverType.toUpperCase();
  return `${letter}${targetOccupied ? "x" : ""}${to}`;
}
