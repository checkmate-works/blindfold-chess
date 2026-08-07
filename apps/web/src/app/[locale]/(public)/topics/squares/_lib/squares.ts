import { computeSquareColor } from '@blindfold-chess/features/common';
import type { Square } from '@blindfold-chess/types';
import { FILES, RANKS } from '@blindfold-chess/types';

export type { Square } from '@blindfold-chess/types';

// The shared predicate already narrows to `Square`; re-exported so existing
// importers of this module keep working.
export { isValidSquare } from '@blindfold-chess/features/common';

export function getAllSquares(): Square[] {
  const squares: Square[] = [];
  for (const rank of [...RANKS].reverse()) {
    for (const file of FILES) {
      squares.push(`${file}${rank}` as Square);
    }
  }
  return squares;
}

export function isLightSquare(square: Square): boolean {
  return computeSquareColor(square) === 'light';
}
