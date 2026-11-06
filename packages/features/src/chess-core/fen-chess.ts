/**
 * FEN helpers that depend on `chess.js`. The chess.js-free counterpart is
 * `./fen-pure.ts`. If you add a helper that does not need chess.js, put it in
 * `fen-pure.ts` instead — keeping pure helpers out of this file preserves the
 * bundle-size benefit of the `@blindfold-chess/features/chess-core/fen`
 * subpath export.
 */
import { Chess } from "chess.js";

import { STARTING_FEN } from "./fen-pure";

import type { BoardPiece } from "./types";

/**
 * Whether chess.js accepts `fen`. A boolean only, with no reason; for a
 * diagnostic, or for the legality checks chess.js is lenient about (castling
 * rights without a rook, impossible en-passant targets), use
 * `validateFenSemantic`.
 */
export function validateFen(fen: string): boolean {
  if (!fen.trim()) return false;

  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

/**
 * The 8×8 board for `fen`, rank 8 first (`[0][0]` is a8, `[7][7]` is h1), with
 * `null` for empty squares. Throws if chess.js rejects the FEN.
 */
export function fenToBoard(fen: string): BoardPiece[][] {
  const chess = new Chess(fen);
  return chess.board();
}

/**
 * The position after applying `moves` (SAN) to `initialFen`.
 *
 * Throws on an invalid FEN or on the first illegal move, unlike the replay
 * helpers in `./moves` that stop at the legal prefix: a caller asking for the
 * position after a game must not be handed the position after a shorter one.
 */
export function getFenAfterMoves(initialFen: string, moves: string[]): string {
  const chess = new Chess(initialFen);
  for (const move of moves) {
    chess.move(move);
  }
  return chess.fen();
}

export function getStartingFen(): string {
  return STARTING_FEN;
}
