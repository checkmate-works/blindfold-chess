import { expandRank } from './fen-utils';

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
  const boardPart = boardFen.split(' ')[0];
  const ranks = boardPart.split('/');

  // FEN ranks: index 0 = rank 8, index 7 = rank 1
  // For white's turn, check rank 5 → index 3
  // For black's turn, check rank 4 → index 4
  const rankIndex = turn === 'w' ? 3 : 4;
  const expectedPawn = turn === 'w' ? 'p' : 'P';

  const rank = expandRank(ranks[rankIndex]);

  const result: Record<string, boolean> = {};
  for (let i = 0; i < FILES.length; i++) {
    result[FILES[i]] = rank[i] === expectedPawn;
  }
  return result;
}
