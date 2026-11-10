import type { PieceColor } from '@blindfold-chess/types';

/**
 * Empty-board FEN sentinel used by editable-board flows to reset the
 * editor. Note: this fails `validateFen`'s king-count check, so the
 * usual fen-validation path skips applying it — callers that reset
 * the board bypass validation and set this directly. Defined in the
 * shared FEN practice module, whose session starts every problem from it.
 */
export { EMPTY_BOARD_FEN } from '@blindfold-chess/features/fen-practice';

export type EditorTab = 'board' | 'fen';
/** Alias of the canonical {@link PieceColor}, kept for existing importers. */
export type SideToMove = PieceColor;
