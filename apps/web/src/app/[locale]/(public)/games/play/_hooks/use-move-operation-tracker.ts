import { useCallback, useRef, useState } from 'react';

import { EMPTY_OPERATION_TOTALS } from '@/lib/games/operation-totals';
import type {
  MoveInputMethod,
  MoveOperationLog,
  OperationTotals,
  UndoneMoveLog,
} from '@/lib/games/saved-game-types';
import { MAX_UNDONE_LOGS } from '@/lib/games/undone-logs';

type UseMoveOperationTrackerOptions = {
  initialLogs?: MoveOperationLog[];
};

/**
 * Hook for tracking per-move operation metadata (input method, peek count, undo count).
 *
 * Each entry in the logs array corresponds to one player move.
 * Counters (peekCount, undoCount) accumulate during a move and reset on commit.
 *
 * Alongside the per-move log it keeps {@link OperationTotals}: game-lifetime
 * counters bumped at the moment each operation happens. The per-move log
 * follows "undo = the move never happened" (entries and in-flight counters
 * are discarded), but the totals deliberately do NOT — they are the audit /
 * promotion-eligibility record that survives undo and restart (issue #95).
 *
 * What the discarded entries CONTAINED (notably rejected SAN texts, which
 * counts cannot reconstruct) is archived into `undoneLogs`
 * ({@link UndoneMoveLog}) at the moment of the rollback, capped at
 * {@link MAX_UNDONE_LOGS} per game.
 */
export function useMoveOperationTracker({ initialLogs }: UseMoveOperationTrackerOptions = {}) {
  const [logs, setLogs] = useState<MoveOperationLog[]>(initialLogs ?? []);
  const [totals, setTotals] = useState<OperationTotals>(EMPTY_OPERATION_TOTALS);
  const [undoneLogs, setUndoneLogs] = useState<UndoneMoveLog[]>([]);
  // Synchronous mirror of `logs`, updated by every mutator below (not by a
  // render-time assignment): the rollback handlers must archive the entries
  // they are about to remove, and doing that inside a setLogs updater would
  // be a side effect (updaters may run twice under StrictMode) while a
  // render-synced ref would be stale for same-tick commit→undo sequences.
  const logsRef = useRef(logs);

  /** Append discard records, respecting the per-game cap (earliest kept). */
  const archiveDiscarded = useCallback((discarded: UndoneMoveLog[]) => {
    if (discarded.length === 0) return;
    setUndoneLogs((prev) => {
      const room = MAX_UNDONE_LOGS - prev.length;
      return room <= 0 ? prev : [...prev, ...discarded.slice(0, room)];
    });
  }, []);
  const peekCountRef = useRef(0);
  const undoCountRef = useRef(0);
  const movePeekCountRef = useRef(0);
  const invalidCountRef = useRef(0);
  // The rejected move texts behind `invalidCountRef` (text/select/button paths
  // only). Capped so one pathological turn can't bloat the persisted entry; the
  // count still increments past the cap.
  const invalidAttemptsRef = useRef<string[]>([]);

  // Reset every counter that accumulates during a single move. Called from
  // commit / undo / truncate so the ref state stays in sync with the
  // visible log table. Centralized to avoid forgetting any one counter
  // when the list grows again.
  const resetCounters = useCallback(() => {
    peekCountRef.current = 0;
    undoCountRef.current = 0;
    movePeekCountRef.current = 0;
    invalidCountRef.current = 0;
    invalidAttemptsRef.current = [];
  }, []);

  /** Increment peek counter for the current move (and the lifetime total). */
  const recordPeek = useCallback(() => {
    peekCountRef.current += 1;
    setTotals((t) => ({ ...t, peeks: t.peeks + 1 }));
  }, []);

  /** Increment undo counter for the current move (and the lifetime total). */
  const recordUndo = useCallback(() => {
    undoCountRef.current += 1;
    setTotals((t) => ({ ...t, undos: t.undos + 1 }));
  }, []);

  /** Increment move-peek counter for the current move (viewing legal moves hint). */
  const recordMovePeek = useCallback(() => {
    movePeekCountRef.current += 1;
    setTotals((t) => ({ ...t, movePeeks: t.movePeeks + 1 }));
  }, []);

  /**
   * Record an invalid-move attempt for the current move. Always bumps the
   * count; when the attempted move text is known (text / select / button
   * submissions — the SAN is in scope at rejection), it is also appended to
   * `invalidAttemptsRef` (board mis-grabs pass none → count only). Capped at 20
   * texts per move to keep the persisted entry small.
   */
  const recordInvalid = useCallback((attempt?: string) => {
    invalidCountRef.current += 1;
    setTotals((t) => ({ ...t, invalidMoves: t.invalidMoves + 1 }));
    if (attempt && invalidAttemptsRef.current.length < 20) {
      invalidAttemptsRef.current.push(attempt);
    }
  }, []);

  /**
   * Finalize the current move's log entry and reset counters.
   * Called when the player submits a move.
   */
  const commitMove = useCallback(
    (inputMethod: MoveInputMethod) => {
      const entry: MoveOperationLog = {
        inputMethod,
        peekCount: peekCountRef.current,
        undoCount: undoCountRef.current,
        movePeekCount: movePeekCountRef.current,
        invalidCount: invalidCountRef.current,
        // Only persist the texts when some were captured; otherwise leave the
        // field off so legacy-shaped (count-only) entries stay clean.
        invalidAttempts:
          invalidAttemptsRef.current.length > 0 ? [...invalidAttemptsRef.current] : undefined,
      };
      logsRef.current = [...logsRef.current, entry];
      setLogs(logsRef.current);
      resetCounters();
    },
    [resetCounters]
  );

  /**
   * Handle undo: remove the last player's log entry and discard in-flight
   * peek/movePeek/invalid counters that belonged to the undone turn.
   * Called when the player undoes a move (which removes both the player and AI moves).
   *
   * Design note: peekCount/movePeekCount/invalidCount are intentionally
   * discarded — they describe operations performed while considering the
   * move being undone, so under the "undo = the move never happened"
   * principle they go away with it. `undoCountRef` is *deliberately
   * preserved*: it tracks how many times the player has pressed Undo
   * before the next move commits, and zeroing it would silently drop the
   * record of every undo but the most recent when the player Undos twice
   * in a row. The caller still calls `recordUndo()` after this to
   * increment the count by one for this undo.
   *
   * `totals` is deliberately untouched: it is the monotonic audit record,
   * so the peeks/invalids discarded from the per-move view here stay
   * counted there (issue #95 — undo must not launder aid usage). What the
   * discarded entry/attempts CONTAINED is archived into `undoneLogs`
   * before removal, so the rollback erases nothing from the audit record.
   *
   * `retractedSans` — the SAN(s) the caller is about to remove from
   * `moves[]` (board order: `[player's move, AI's reply]`) — is archived
   * onto the same entry when non-empty, so a later replay can re-enact the
   * retracted move rather than only badge it. Omitted for
   * restart-from-position (`truncateLogs`, below), which never records
   * `sans`: with potentially many discarded entries and no simple
   * one-to-one move mapping, the value is low relative to the complexity.
   */
  const handleUndoLog = useCallback(
    (retractedSans?: string[]) => {
      const current = logsRef.current;
      const removed = current.length > 0 ? current[current.length - 1] : undefined;
      const pending = invalidAttemptsRef.current;
      if (removed !== undefined || pending.length > 0) {
        archiveDiscarded([
          {
            index: removed !== undefined ? current.length - 1 : current.length,
            ...(removed !== undefined ? { log: removed } : {}),
            ...(pending.length > 0 ? { pendingInvalidAttempts: [...pending] } : {}),
            ...(retractedSans && retractedSans.length > 0 ? { sans: retractedSans } : {}),
          },
        ]);
      }
      logsRef.current = current.slice(0, -1);
      setLogs(logsRef.current);
      peekCountRef.current = 0;
      movePeekCountRef.current = 0;
      invalidCountRef.current = 0;
      invalidAttemptsRef.current = [];
    },
    [archiveDiscarded]
  );

  /**
   * Truncate logs to the specified count and reset current counters.
   * Used when restarting from a specific position. `totals` keeps
   * accumulating across the restart — same-game history never resets —
   * and the truncated-away entries (plus any in-flight rejected attempts)
   * are archived into `undoneLogs` like an undo's.
   */
  const truncateLogs = useCallback(
    (count: number) => {
      const current = logsRef.current;
      const discarded: UndoneMoveLog[] = current
        .slice(count)
        .map((entry, i) => ({ index: count + i, log: entry }));
      if (invalidAttemptsRef.current.length > 0) {
        discarded.push({
          index: current.length,
          pendingInvalidAttempts: [...invalidAttemptsRef.current],
        });
      }
      archiveDiscarded(discarded);
      logsRef.current = current.slice(0, count);
      setLogs(logsRef.current);
      resetCounters();
    },
    [archiveDiscarded, resetCounters]
  );

  /**
   * Replace all logs with the given array. Used to restore logs from a
   * loaded game (restore `totals` / `undoneLogs` alongside — separate
   * state slices).
   *
   * Deliberately does NOT reset the in-flight counters: on a genuine
   * resume they are still zero (fresh mount), so a reset is a no-op —
   * while on the mid-session restore race (new game → initial save → URL
   * gains its gameId, see {@link restoreTotals}) a reset would wipe
   * peeks/invalid attempts recorded between mount and the restore,
   * silently dropping them from the next committed entry.
   */
  const setLogsTo = useCallback((newLogs: MoveOperationLog[]) => {
    logsRef.current = newLogs;
    setLogs(newLogs);
  }, []);

  /**
   * Restore the lifetime totals from a loaded game — as a per-counter MAX
   * merge, never a plain overwrite. The restore effect can fire mid-session
   * with a stale snapshot: a brand-new game saves on mount, the URL then
   * gains its gameId, and the storage record (captured before any play) is
   * "restored" over live state that may already hold recorded operations.
   * The counters are monotonic, so whichever side is larger is the truth;
   * max keeps live progress in that race and still adopts the stored
   * baseline on a genuine resume (where live state is all zeros).
   */
  const restoreTotals = useCallback((restored: OperationTotals) => {
    setTotals((current) => ({
      peeks: Math.max(current.peeks, restored.peeks),
      movePeeks: Math.max(current.movePeeks, restored.movePeeks),
      undos: Math.max(current.undos, restored.undos),
      invalidMoves: Math.max(current.invalidMoves, restored.invalidMoves),
    }));
  }, []);

  /**
   * Restore the archived discards from a loaded game. Same stale-snapshot
   * race as {@link restoreTotals}, resolved the same way for a list: the
   * archive is append-only within a game, so the restored snapshot is
   * always a prefix of live state (or vice versa) — keep the longer side.
   */
  const restoreUndoneLogs = useCallback((restored: UndoneMoveLog[]) => {
    setUndoneLogs((current) => (restored.length > current.length ? restored : current));
  }, []);

  return {
    logs,
    totals,
    undoneLogs,
    recordPeek,
    recordUndo,
    recordMovePeek,
    recordInvalid,
    commitMove,
    handleUndoLog,
    truncateLogs,
    setLogsTo,
    restoreTotals,
    restoreUndoneLogs,
  };
}
