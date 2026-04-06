import {
  computeSquareColor,
  isValidSquare as isValidSquareBase,
} from '@blindfold-chess/features/common';
import type { Square } from '@blindfold-chess/types';
import { FILES, RANKS } from '@blindfold-chess/types';

export type { File, Rank, Square } from '@blindfold-chess/types';

export function isValidSquare(value: string): value is Square {
  return isValidSquareBase(value);
}

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
