export type MoveLogEntry = {
  moveNumber: number;
  isWhiteMove: boolean;
  move: string;
  /**
   * - `correct`: the user recalled and entered the move.
   * - `incorrect`: a wrong attempt (`incorrectMove` holds what was entered).
   * - `skipped`: the user explicitly gave up on this move ("I don't know")
   *   — it counts against recall.
   * - `autoFilled`: the move was bulk-resolved by "Auto-fill All" rather than
   *   given up on one at a time — counts against recall the same as
   *   `skipped`, but is tracked separately so the summary can collapse the
   *   whole auto-filled run into one marker instead of repeating it per move.
   * - `auto`: the opponent's move auto-filled in auto-opponent mode — NOT the
   *   user's responsibility, excluded from recall stats.
   */
  status: 'correct' | 'incorrect' | 'auto' | 'skipped' | 'autoFilled';
  incorrectMove?: string;
};
