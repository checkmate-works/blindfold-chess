/**
 * FEN helpers that depend on `chess.js`. The chess.js-free counterpart is
 * `./fen-pure.ts`. If you add a helper that does not need chess.js, put it in
 * `fen-pure.ts` instead — keeping pure helpers out of this file preserves the
 * bundle-size benefit of the `@blindfold-chess/features/chess-core/fen`
 * subpath export.
 */
import { Chess, DEFAULT_POSITION } from "chess.js";

import type { BoardPiece } from "./types";

export function validateFen(fen: string): boolean {
  if (!fen.trim()) return false;

  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

export function fenToBoard(fen: string): BoardPiece[][] {
  const chess = new Chess(fen);
  return chess.board();
}

export function getFenAfterMoves(initialFen: string, moves: string[]): string {
  const chess = new Chess(initialFen);
  for (const move of moves) {
    chess.move(move);
  }
  return chess.fen();
}

export function getStartingFen(): string {
  return DEFAULT_POSITION;
}
