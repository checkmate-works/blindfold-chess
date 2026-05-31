export type MoveLogEntry = {
  moveNumber: number;
  isWhiteMove: boolean;
  move: string;
  /**
   * - `correct`: the user recalled and entered the move.
   * - `incorrect`: a wrong attempt (`incorrectMove` holds what was entered).
   * - `skipped`: the user gave up on this move ("I don't know" / "auto-fill
   *   all") — it counts against recall.
   * - `auto`: the opponent's move auto-filled in auto-opponent mode — NOT the
   *   user's responsibility, excluded from recall stats.
   */
  status: 'correct' | 'incorrect' | 'auto' | 'skipped';
  incorrectMove?: string;
};
