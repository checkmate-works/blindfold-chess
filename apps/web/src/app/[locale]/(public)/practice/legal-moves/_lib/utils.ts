import type { PieceType } from './types';

export {
  isLegalMove,
  generateBalancedMoveQuestions,
  generateMoveQuestionForPiece,
} from '@blindfold-chess/features/legal-moves';

export const PIECE_TYPE_TO_NAME: Record<string, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

export const PIECE_NAME_TO_TYPE: Record<string, PieceType> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
};
