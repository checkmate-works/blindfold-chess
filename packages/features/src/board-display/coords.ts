/**
 * Convert an algebraic square name ("e4") into 0-based board-array indices,
 * where `rankIndex` 0 is rank 8 (the top row of a white-oriented board array,
 * as produced by chess-core's `fenToBoard`). Returns null for malformed
 * square names.
 */
export function squareToBoardIndices(
  square: string,
): { fileIndex: number; rankIndex: number } | null {
  if (square.length !== 2) return null;
  const fileIndex = square.charCodeAt(0) - "a".charCodeAt(0);
  const rankNum = Number.parseInt(square[1], 10);
  if (Number.isNaN(rankNum) || rankNum < 1 || rankNum > 8) return null;
  if (fileIndex < 0 || fileIndex > 7) return null;
  return { fileIndex, rankIndex: 8 - rankNum };
}
