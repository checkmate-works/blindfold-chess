import type { CastlingRights } from '../_components/PositionSettings';
import { expandRank } from './fen-utils';

/**
 * Given a board FEN (piece placement only), returns which castling rights
 * are possible based on whether the king and rook are on their initial squares.
 */
export function getCastlingAvailability(boardFen: string): CastlingRights {
  const boardPart = boardFen.split(' ')[0];
  const ranks = boardPart.split('/');

  // FEN ranks: index 0 = rank 8, index 7 = rank 1
  const rank1 = expandRank(ranks[7]); // white pieces
  const rank8 = expandRank(ranks[0]); // black pieces

  return {
    K: rank1[4] === 'K' && rank1[7] === 'R', // e1=King, h1=Rook
    Q: rank1[4] === 'K' && rank1[0] === 'R', // e1=King, a1=Rook
    k: rank8[4] === 'k' && rank8[7] === 'r', // e8=king, h8=rook
    q: rank8[4] === 'k' && rank8[0] === 'r', // e8=king, a8=rook
  };
}
