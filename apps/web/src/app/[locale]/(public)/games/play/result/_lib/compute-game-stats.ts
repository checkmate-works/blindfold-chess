import type { MoveOperationLog } from '@/lib/games/saved-game-types';

/**
 * What stood out on a single player move, for the per-move effort strip.
 * Severity order (highest first): illegal → takeback → peek → hint → clean.
 * Each move surfaces only its most-severe marker so the strip reads at a
 * glance.
 */
export type MoveMarker = 'illegal' | 'takeback' | 'peek' | 'hint' | 'clean';

export type GameStats = {
  /** One log per player move, so this is the player's move count. */
  totalMoves: number;
  /** Σ peekCount — times the board was revealed (peek mode only). */
  peeks: number;
  /** Σ invalidCount — illegal move attempts across all input methods. */
  illegal: number;
  /** Σ undoCount — takebacks. */
  takebacks: number;
  /** Σ movePeekCount — legal-move hints consulted. */
  hints: number;
  /**
   * Moves made with no aid and no mistake (peek/illegal/undo/hint all zero) —
   * the universal "visualized it cleanly, first try" metric that generalises
   * across every board-visibility mode.
   */
  cleanMoves: number;
  /**
   * Moves that used a blindfold-defeating aid: a board peek, a legal-move
   * hint, or a takeback. Illegal-move attempts are deliberately NOT counted —
   * a failed input is a mistake, not an aid. Feeds the Exp purity multiplier
   * (see `calculateGameExp`), so it is the precise per-aid count rather than
   * the strip's most-severe-marker view (a move can be both illegal and
   * peeked; that still counts as aided here).
   */
  aidedMoves: number;
  /** Dominant marker per player move, index-aligned to the operation logs. */
  perMove: MoveMarker[];
};

/** Highest-severity marker for one move's operation log. */
export function markerForLog(log: MoveOperationLog): MoveMarker {
  if ((log.invalidCount ?? 0) > 0) return 'illegal';
  if (log.undoCount > 0) return 'takeback';
  if (log.peekCount > 0) return 'peek';
  if ((log.movePeekCount ?? 0) > 0) return 'hint';
  return 'clean';
}

/**
 * Aggregate per-move operation logs into the result-page overview stats.
 * Pure and synchronous — all values derive from the already-persisted logs,
 * so no extra data is recorded for this.
 */
export function computeGameStats(logs: MoveOperationLog[]): GameStats {
  let peeks = 0;
  let illegal = 0;
  let takebacks = 0;
  let hints = 0;
  let cleanMoves = 0;
  let aidedMoves = 0;
  const perMove: MoveMarker[] = [];

  for (const log of logs) {
    peeks += log.peekCount;
    illegal += log.invalidCount ?? 0;
    takebacks += log.undoCount;
    hints += log.movePeekCount ?? 0;
    const marker = markerForLog(log);
    if (marker === 'clean') cleanMoves += 1;
    if (log.peekCount > 0 || (log.movePeekCount ?? 0) > 0 || log.undoCount > 0) {
      aidedMoves += 1;
    }
    perMove.push(marker);
  }

  return {
    totalMoves: logs.length,
    peeks,
    illegal,
    takebacks,
    hints,
    cleanMoves,
    aidedMoves,
    perMove,
  };
}
