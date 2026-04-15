import { shuffleArray } from '@blindfold-chess/features/common';

import type { PositionData } from '@/app/[locale]/(public)/practice/_lib/types';

import { getFenPositions } from '../_data/positions';

/**
 * Compute the initial list of FEN positions for a session.
 *
 * Precedence:
 *   1. `customFen` (e.g. tutorial) — always a single position, no shuffle/slice.
 *   2. `fens` (from URL params) — optional shuffle, then slice to `problemCount`.
 *   3. Fallback to `getFenPositions()` — optional shuffle, then slice.
 *
 * This is a pure function (modulo `shuffleArray`'s RNG) so it can be called
 * directly from a `useState` initializer and unit-tested in isolation.
 */
export function selectInitialPositions(
  customFen: string | undefined,
  fens: string[] | undefined,
  problemCount: number,
  shuffle: boolean
): PositionData[] {
  if (customFen) {
    const isBlackToMove = customFen.includes(' b ');
    return [{ fen: customFen, isBlackToMove }];
  }

  if (fens && fens.length > 0) {
    let fenPositions: PositionData[] = fens.map((fen) => ({
      fen,
      isBlackToMove: fen.includes(' b '),
    }));
    if (shuffle) {
      fenPositions = shuffleArray(fenPositions);
    }
    return fenPositions.slice(0, problemCount);
  }

  let fenPositions = getFenPositions();
  if (shuffle) {
    fenPositions = shuffleArray(fenPositions);
  }
  return fenPositions.slice(0, problemCount);
}
