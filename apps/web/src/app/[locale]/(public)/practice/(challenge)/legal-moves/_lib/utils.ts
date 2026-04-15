/**
 * Deprecated barrel. Responsibility-named modules live alongside this file:
 *
 * - `./query-params`     — `PIECE_TYPE_TO_NAME`, `PIECE_NAME_TO_TYPE`,
 *                          `VALID_PIECE_NAMES`, `ValidPieceName`
 * - `./legal-moves-api`  — thin re-export layer over
 *                          `@blindfold-chess/features/legal-moves`
 *
 * Prefer importing directly from those modules in new code. This barrel is
 * kept only so existing imports resolve during the migration window.
 */
export {
  PIECE_NAME_TO_TYPE,
  PIECE_TYPE_TO_NAME,
  VALID_PIECE_NAMES,
  type ValidPieceName,
} from './query-params';
export {
  generateBalancedMoveQuestions,
  generateMoveQuestionForPiece,
  isLegalMove,
} from './legal-moves-api';
