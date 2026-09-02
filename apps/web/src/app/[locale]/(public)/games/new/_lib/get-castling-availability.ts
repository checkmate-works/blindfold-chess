import { castlingRightSatisfied, fenToBoardFlat } from '@blindfold-chess/features/chess-core/fen';

import type { CastlingRights } from '../_components/PositionSettings';

/**
 * Given a board FEN (piece placement only), returns which castling rights
 * are possible based on whether the king and rook are on their initial squares.
 *
 * Which squares those are is the same fact semantic FEN validation enforces on
 * a stored position, so it is read from the shared table rather than restated
 * here as flat-board indices.
 */
export function getCastlingAvailability(boardFen: string): CastlingRights {
  const board = fenToBoardFlat(boardFen);

  return {
    K: castlingRightSatisfied(board, 'K'),
    Q: castlingRightSatisfied(board, 'Q'),
    k: castlingRightSatisfied(board, 'k'),
    q: castlingRightSatisfied(board, 'q'),
  };
}
