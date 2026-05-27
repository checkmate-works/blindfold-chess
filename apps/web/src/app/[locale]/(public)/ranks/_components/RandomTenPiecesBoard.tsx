'use client';

import { StaticPositionBoard } from './_shared/StaticPositionBoard';
import type { StaticPiecePlacement } from './_shared/StaticPositionBoard';

/**
 * 10-piece position with no obvious structural pattern, used on the 2kyu
 * guide to demonstrate that working memory (4 ± 1 items) is overwhelmed when
 * pieces cannot be grouped into chunks.
 */
const PLACEMENTS: ReadonlyArray<StaticPiecePlacement> = [
  { square: 'a3', type: 'k', color: 'w' },
  { square: 'c7', type: 'n', color: 'w' },
  { square: 'd4', type: 'p', color: 'w' },
  { square: 'f5', type: 'r', color: 'w' },
  { square: 'h2', type: 'b', color: 'w' },
  { square: 'a8', type: 'n', color: 'b' },
  { square: 'b6', type: 'q', color: 'b' },
  { square: 'e2', type: 'r', color: 'b' },
  { square: 'g8', type: 'k', color: 'b' },
  { square: 'h5', type: 'p', color: 'b' },
];

export function RandomTenPiecesBoard() {
  return <StaticPositionBoard placements={PLACEMENTS} />;
}
