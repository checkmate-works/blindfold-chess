import { shuffleArray } from '@blindfold-chess/features/common';

import { FEN_STRINGS } from '../_data/positions';
import type { PositionData } from './types';

// Re-export shared accuracy utilities
export { calculateAccuracy, calculateSquareDifferences } from '@blindfold-chess/features/common';

// Parse FEN positions
const PRACTICE_POSITIONS: PositionData[] = FEN_STRINGS.map((fen) => {
  const parts = fen.split(' ');
  const isBlackToMove = parts[1] === 'b';
  return { fen, isBlackToMove };
});

export function getRandomPositions(count: number, shuffle: boolean = true): PositionData[] {
  const positions = shuffle ? shuffleArray(PRACTICE_POSITIONS) : [...PRACTICE_POSITIONS];

  return positions.slice(0, Math.min(count, positions.length));
}

export function getCustomPositions(
  fenStrings: string[],
  count: number,
  shuffle: boolean = true
): PositionData[] {
  const parsed = fenStrings.map((fen) => {
    const parts = fen.trim().split(' ');
    const isBlackToMove = parts[1] === 'b';
    return { fen: fen.trim(), isBlackToMove };
  });

  const positions = shuffle ? shuffleArray(parsed) : parsed;

  return positions.slice(0, Math.min(count, positions.length));
}
