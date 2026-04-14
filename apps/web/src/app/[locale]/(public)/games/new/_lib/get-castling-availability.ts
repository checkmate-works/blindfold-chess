import { fenToBoardFlat } from '@blindfold-chess/features/chess-core/fen';

import type { CastlingRights } from '../_components/PositionSettings';

/**
 * Given a board FEN (piece placement only), returns which castling rights
 * are possible based on whether the king and rook are on their initial squares.
 */
export function getCastlingAvailability(boardFen: string): CastlingRights {
  const board = fenToBoardFlat(boardFen);

  // Flat board indices:
  // rank 8: 0(a8)..7(h8), rank 1: 56(a1)..63(h1)
  return {
    K: board[60] === 'K' && board[63] === 'R', // e1=King, h1=Rook
    Q: board[60] === 'K' && board[56] === 'R', // e1=King, a1=Rook
    k: board[4] === 'k' && board[7] === 'r', // e8=king, h8=rook
    q: board[4] === 'k' && board[0] === 'r', // e8=king, a8=rook
  };
}
