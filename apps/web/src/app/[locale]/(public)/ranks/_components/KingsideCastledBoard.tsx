'use client';

import { StaticPositionBoard } from './_shared/StaticPositionBoard';
import type { StaticPiecePlacement } from './_shared/StaticPositionBoard';

/**
 * Both sides castled kingside with only king, rook, and f/g/h pawns
 * remaining. Used on the 2kyu guide as the chunked counterpart to
 * {@link RandomTenPiecesBoard}: the same 10 pieces collapse into two easily
 * memorable "O-O" patterns instead of ten isolated facts.
 */
const PLACEMENTS: ReadonlyArray<StaticPiecePlacement> = [
  { square: 'g1', type: 'k', color: 'w' },
  { square: 'f1', type: 'r', color: 'w' },
  { square: 'f2', type: 'p', color: 'w' },
  { square: 'g2', type: 'p', color: 'w' },
  { square: 'h2', type: 'p', color: 'w' },
  { square: 'g8', type: 'k', color: 'b' },
  { square: 'f8', type: 'r', color: 'b' },
  { square: 'f7', type: 'p', color: 'b' },
  { square: 'g7', type: 'p', color: 'b' },
  { square: 'h7', type: 'p', color: 'b' },
];

export function KingsideCastledBoard() {
  return <StaticPositionBoard placements={PLACEMENTS} />;
}
