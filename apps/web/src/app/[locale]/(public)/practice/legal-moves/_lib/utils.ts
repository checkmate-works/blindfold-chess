import { PIECE_SHORT_TO_NAME } from '@/lib/chess-pieces';

import type { PieceType } from './types';

export {
  isLegalMove,
  generateBalancedMoveQuestions,
  generateMoveQuestionForPiece,
} from '@blindfold-chess/features/legal-moves';

/** Map from short piece code to full piece name (alias for PIECE_SHORT_TO_NAME). */
export const PIECE_TYPE_TO_NAME: Record<string, string> = PIECE_SHORT_TO_NAME;

/** Map from full piece name to short piece code. */
export const PIECE_NAME_TO_TYPE: Record<string, PieceType> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
};
