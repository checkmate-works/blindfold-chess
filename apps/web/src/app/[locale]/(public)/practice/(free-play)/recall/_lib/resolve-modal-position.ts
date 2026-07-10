import type { MoveLogEntry } from './move-log-entry';

/**
 * Resolve a moveLog entry to a `useMoveNavigation`-style position (-2 =
 * start, 0..N-1 = the board right after that moves[] index) for the "view
 * this position" quick-peek modal opened from the completion summary's
 * per-move strip.
 *
 * The log is a stream of events, not one-per-move: `incorrect` entries are
 * failed attempts that don't advance the game, so `originalMoveIndex` only
 * increments past non-incorrect entries as we walk forward. A clicked
 * `incorrect` entry therefore resolves to the position BEFORE that mistake
 * (or the start, if it was the very first move attempted); every other
 * status resolves to the position right after its own move.
 */
export function resolveModalPosition(entry: MoveLogEntry, moveLog: MoveLogEntry[]): number {
  let originalMoveIndex = 0;
  for (const logEntry of moveLog) {
    if (logEntry === entry) {
      if (entry.status === 'incorrect') {
        return originalMoveIndex > 0 ? originalMoveIndex - 1 : -2;
      }
      return originalMoveIndex;
    }
    if (logEntry.status !== 'incorrect') {
      originalMoveIndex++;
    }
  }
  return -2;
}
