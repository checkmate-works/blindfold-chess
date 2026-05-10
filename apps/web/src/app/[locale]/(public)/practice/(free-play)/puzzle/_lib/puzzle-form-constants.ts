/**
 * Empty-board FEN sentinel used by the create form to reset the editor.
 * Note: this fails `validateFen`'s king-count check, so the normal
 * fen-validation path skips applying it — callers that reset the
 * board bypass validation and set this directly.
 */
export const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

/** Per-puzzle solution-move ceiling (UI hard limit). */
export const MAX_SOLUTION_MOVES = 20;

export type EditorTab = 'board' | 'fen';
export type SideToMove = 'w' | 'b';
