import type { PieceColor } from "./types";

/**
 * What an interactive-board input (click or drag-drop) should do next.
 * Generic over the caller's legal-move candidate type so this module stays
 * independent of chess-core.
 *
 * - `noop` — nothing happens (e.g. first click on an empty square).
 * - `select` — (re)select `square` as the move source. A normal-display
 *   reselect of another movable piece is NOT a mistake (lichess idiom).
 * - `deselect` — clear the current selection (click on the selected square).
 * - `illegal-clear` — count one illegal-move attempt and clear the selection.
 *   Carries the attempted `from`/`to` squares so the caller can record *which*
 *   move was rejected (there is a real source + destination here, unlike the
 *   payload-less first-tap `illegal`).
 * - `move` — exactly one legal candidate; emit it.
 * - `promotion` — several candidates for the same (from, to) pair (one per
 *   promotion piece); surface the promotion picker and defer the emit.
 */
export type BoardClickAction<M> =
  | { type: "noop" }
  | { type: "select"; square: string }
  | { type: "deselect" }
  | { type: "illegal-clear"; from: string; to: string }
  | { type: "move"; move: M }
  | { type: "promotion"; from: string; to: string; candidates: M[] };

/**
 * Classify a completed move attempt (drag-drop, or click-to-move with a
 * selection) by candidate count: 0 = illegal, 1 = emit, >1 = promotion
 * ambiguity. A drop onto a non-legal square (including onto an own piece —
 * you cannot capture your own) is an explicit, deliberate attempt, so it
 * always counts as one illegal move regardless of obfuscation.
 */
export function classifyMoveAttempt<M>(
  from: string,
  to: string,
  candidates: M[],
): BoardClickAction<M> {
  if (candidates.length === 0) return { type: "illegal-clear", from, to };
  if (candidates.length === 1) return { type: "move", move: candidates[0] };
  return { type: "promotion", from, to, candidates };
}

/**
 * The click-to-move state machine, including the illegal-attempt counting
 * policy. Independent of whether the board is obfuscated (discs / single-colour
 * / hidden pieces): tapping a piece is a *selection*, and selection intent does
 * not change with how the piece is drawn.
 *
 * What counts as an illegal attempt (the lichess / chess.com idiom, applied in
 * every display mode):
 *
 * - A tap on another own movable piece is a (re)selection — changing WHICH
 *   piece to move — never a mistake. This covers "I picked up the d-pawn, then
 *   changed my mind and tapped my knight": a change of intent, not an illegal
 *   move onto one's own piece.
 * - Only a tap on a real destination (an empty square or an opponent piece)
 *   that no legal move reaches counts as one illegal attempt.
 *
 * A *first* tap (nothing selected yet) is never counted: an empty square or a
 * mis-grabbed opponent piece is indistinguishable from a misclick and names no
 * move. Only a completed source → destination attempt counts.
 *
 * Drag-and-drop is classified separately by {@link classifyMoveAttempt}: a drag
 * is a committed from→to gesture, so dropping onto one's own piece IS a counted
 * illegal attempt there — there is no reselect semantics mid-drag.
 *
 * `findCandidates` is invoked lazily, only when a selection exists and the
 * click might complete a move.
 */
export function classifyBoardClick<M>(params: {
  square: string;
  selectedSquare: string | null;
  /** Color of the piece on the clicked square, or null when empty. */
  pieceColor: PieceColor | null;
  /** The color the user is allowed to pick up (own color, or side to move). */
  movableColor: PieceColor;
  findCandidates: (from: string, to: string) => M[];
}): BoardClickAction<M> {
  const { square, selectedSquare, pieceColor, movableColor } = params;
  const clickedMovable = pieceColor !== null && pieceColor === movableColor;

  if (selectedSquare === null) {
    // A first tap only ever selects (own movable piece) or does nothing. A
    // mis-grabbed opponent piece is NOT counted — it names no move and is
    // indistinguishable from a misclick; only a completed from→to attempt
    // below counts.
    if (clickedMovable) return { type: "select", square };
    return { type: "noop" };
  }

  if (selectedSquare === square) return { type: "deselect" };

  const candidates = params.findCandidates(selectedSquare, square);
  if (candidates.length > 0) {
    return classifyMoveAttempt(selectedSquare, square, candidates);
  }

  // Reselect another own movable piece silently — a change of which piece to
  // move, not a move attempt. Anything else (empty square / opponent piece) is
  // a real destination that no legal move reached: a genuine illegal attempt.
  if (clickedMovable) return { type: "select", square };
  return { type: "illegal-clear", from: selectedSquare, to: square };
}
