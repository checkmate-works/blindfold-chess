import { fenToPlacements } from '@blindfold-chess/features/chess-core/fen';
import type { PieceColor, PieceType } from '@blindfold-chess/types';

export type StaticPiecePlacement = {
  square: string;
  type: PieceType;
  color: PieceColor;
};

/**
 * Parse the piece-placement field of a FEN into {@link StaticPiecePlacement}s.
 *
 * Deliberately chess.js-free (no validation): the rank guides include
 * illegal-by-the-rules positions such as a kingless all-pawns example, which
 * `chess.js` (and therefore `fenToBoard` / `ChessBoard`) would reject. The
 * shared `fenToPlacements` is reached through the `chess-core/fen` subpath,
 * which carries no chess.js — this used to be a hand-written scan because the
 * only parser anyone knew about was the validating one.
 *
 * Lives in its own directive-free module (not in `StaticPositionBoard.tsx`,
 * which is `'use client'`) so the Server Component guide boards can call it
 * at module scope — every export of a client module is a client reference,
 * and calling one during a server render throws at build time.
 */
export function fenToStaticPlacements(fen: string): StaticPiecePlacement[] {
  return fenToPlacements(fen);
}
