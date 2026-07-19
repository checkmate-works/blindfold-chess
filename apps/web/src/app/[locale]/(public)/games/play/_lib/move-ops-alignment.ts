import type { Side } from '@blindfold-chess/types';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { getMovingSide } from './fen-utils';

/**
 * Operation-log ↔ move-index alignment.
 *
 * Operation logs are recorded one entry per PLAYER move, while the move list
 * indexes every half-move. The single alignment rule — `logs[i]` belongs to
 * the i-th player move — lives here so the MovesPanel ops icons and the
 * OperationLogModal table stay in agreement.
 */

/** True iff at least one counter on the log entry is non-zero. */
export function hasOps(log: MoveOperationLog): boolean {
  return (
    log.peekCount > 0 ||
    log.undoCount > 0 ||
    (log.movePeekCount ?? 0) > 0 ||
    (log.invalidCount ?? 0) > 0
  );
}

/**
 * Indices into `moves[]` that the player played: `logs[i]` aligns with
 * `getPlayerMoveIndices(...)[i]`.
 *
 * `setupPlies` is the seeded prefix length ({@link Game.setupPlies}): those
 * leading moves were pre-played at setup, so no log entry exists for them
 * even when they are the player's colour — alignment starts after them.
 */
export function getPlayerMoveIndices(
  movesLength: number,
  startingFen: string | undefined,
  playerSide: Side,
  setupPlies = 0
): number[] {
  const result: number[] = [];
  for (let i = Math.max(0, setupPlies); i < movesLength; i++) {
    if (getMovingSide(i, startingFen) === playerSide) result.push(i);
  }
  return result;
}

/**
 * The log entry aligned with a given `moves[]` index, or null when the index
 * is not a player move or the log has no entry for it (e.g. an in-progress
 * move not yet committed).
 */
export function logForMovesIndex(
  movesIndex: number | undefined,
  playerMoveIndices: readonly number[],
  logs: readonly MoveOperationLog[]
): MoveOperationLog | null {
  if (movesIndex === undefined) return null;
  const logIndex = playerMoveIndices.indexOf(movesIndex);
  if (logIndex === -1 || logIndex >= logs.length) return null;
  return logs[logIndex];
}

export type OpsRow = { label: string; value: number; detail?: string };

/**
 * A single move's non-zero op counters as display rows, in a fixed order
 * (peek, undo, hints, invalid). `detail` on the invalid row carries the
 * rejected move texts (e.g. "Nf3, Bb4") when captured, so a review can show
 * *what* was tried, not just how many attempts — see
 * {@link MoveOperationLog.invalidAttempts}. Shared by `OpsPopover` (the live
 * play move list) and the shared-game per-move position panel so both render
 * identically from the same log entry.
 */
export function buildOpsRows(
  log: MoveOperationLog,
  labels: { peek: string; undo: string; hints: string; invalid: string }
): OpsRow[] {
  const rows: OpsRow[] = [];
  if (log.peekCount > 0) rows.push({ label: labels.peek, value: log.peekCount });
  if (log.undoCount > 0) rows.push({ label: labels.undo, value: log.undoCount });
  if ((log.movePeekCount ?? 0) > 0)
    rows.push({ label: labels.hints, value: log.movePeekCount as number });
  if ((log.invalidCount ?? 0) > 0) {
    const attempts = (log.invalidAttempts ?? []).filter((s) => typeof s === 'string');
    rows.push({
      label: labels.invalid,
      value: log.invalidCount as number,
      detail: attempts.length > 0 ? attempts.join(', ') : undefined,
    });
  }
  return rows;
}
