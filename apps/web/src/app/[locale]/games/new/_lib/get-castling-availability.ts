import type { CastlingRights } from '../_components/PositionSettings';

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

/** Expands a FEN rank string into an 8-element array of piece characters (or empty string). */
function expandRank(rank: string): string[] {
  const result: string[] = [];
  for (const ch of rank) {
    const digit = Number(ch);
    if (digit >= 1 && digit <= 8) {
      for (let i = 0; i < digit; i++) result.push('');
    } else {
      result.push(ch);
    }
  }
  return result;
}
