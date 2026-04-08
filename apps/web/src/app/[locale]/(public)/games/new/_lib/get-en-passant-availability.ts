import { fenToBoardFlat } from '@blindfold-chess/features/chess-core';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

/**
 * Given a board FEN (piece placement only) and the side to move,
 * returns which en passant target squares are valid based on pawn positions.
 *
 * For white's turn (en passant targets on rank 6):
 *   file X is available only when a black pawn ('p') exists on X5 (rank 5).
 * For black's turn (en passant targets on rank 3):
 *   file X is available only when a white pawn ('P') exists on X4 (rank 4).
 */
export function getEnPassantAvailability(
  boardFen: string,
  turn: 'w' | 'b'
): Record<string, boolean> {
  const board = fenToBoardFlat(boardFen);

  // Flat board indices:
  // rank 8: 0..7, rank 7: 8..15, rank 6: 16..23, rank 5: 24..31,
  // rank 4: 32..39, rank 3: 40..47, rank 2: 48..55, rank 1: 56..63
  //
  // For white's turn, check rank 5 (indices 24..31)
  // For black's turn, check rank 4 (indices 32..39)
  const rankOffset = turn === 'w' ? 24 : 32;
  const expectedPawn = turn === 'w' ? 'p' : 'P';

  const result: Record<string, boolean> = {};
  for (let i = 0; i < FILES.length; i++) {
    result[FILES[i]] = board[rankOffset + i] === expectedPawn;
  }
  return result;
}
