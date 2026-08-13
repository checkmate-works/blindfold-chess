import {
  fullmoveNumberFromFen,
  isBlackToMoveFromFen,
} from '@blindfold-chess/features/chess-core/fen';
import type { Side } from '@blindfold-chess/types';

/**
 * Parse FEN metadata to determine starting side and move number.
 */
export function parseFenMeta(fen: string | undefined | null): {
  startsAsBlack: boolean;
  startMoveNumber: number;
} {
  if (!fen) {
    return { startsAsBlack: false, startMoveNumber: 1 };
  }

  return {
    startsAsBlack: isBlackToMoveFromFen(fen),
    startMoveNumber: fullmoveNumberFromFen(fen),
  };
}

/**
 * Determine which side made the move at the given index, considering the starting FEN.
 * Returns 'white' or 'black'.
 */
export function getMovingSide(moveIndex: number, startingFen?: string | null): Side {
  const { startsAsBlack } = parseFenMeta(startingFen);
  const isStartingSideMove = moveIndex % 2 === 0;
  const startingSide: Side = startsAsBlack ? 'black' : 'white';
  return isStartingSideMove ? startingSide : startingSide === 'white' ? 'black' : 'white';
}

/**
 * Count how many moves belong to a given side up to (and including) `upToIndex`.
 * Useful for mapping moves array indices to operation log indices.
 *
 * `fromIndex` skips a seeded setup prefix ({@link Game.setupPlies}): those
 * moves were pre-played at setup and have no operation-log entry, so callers
 * mapping to log indices must not count them.
 */
export function countPlayerMoves(
  upToIndex: number,
  playerSide: Side,
  startingFen?: string | null,
  fromIndex = 0
): number {
  let count = 0;
  for (let i = Math.max(0, fromIndex); i <= upToIndex; i++) {
    if (getMovingSide(i, startingFen) === playerSide) count++;
  }
  return count;
}
