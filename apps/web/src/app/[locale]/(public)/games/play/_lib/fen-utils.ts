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

  const parts = fen.split(' ');
  return {
    startsAsBlack: parts[1] === 'b',
    startMoveNumber: parseInt(parts[5]) || 1,
  };
}

/**
 * Determine which side made the move at the given index, considering the starting FEN.
 * Returns 'white' or 'black'.
 */
export function getMovingSide(moveIndex: number, startingFen?: string | null): 'white' | 'black' {
  const { startsAsBlack } = parseFenMeta(startingFen);
  const isStartingSideMove = moveIndex % 2 === 0;
  const startingSide: 'white' | 'black' = startsAsBlack ? 'black' : 'white';
  return isStartingSideMove ? startingSide : startingSide === 'white' ? 'black' : 'white';
}

/**
 * Count how many moves belong to a given side up to (and including) `upToIndex`.
 * Useful for mapping moves array indices to operation log indices.
 */
export function countPlayerMoves(
  upToIndex: number,
  playerSide: 'white' | 'black',
  startingFen?: string | null
): number {
  let count = 0;
  for (let i = 0; i <= upToIndex; i++) {
    if (getMovingSide(i, startingFen) === playerSide) count++;
  }
  return count;
}
