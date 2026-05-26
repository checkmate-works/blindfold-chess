import { useCallback, useRef, useState } from 'react';

import type { MoveInputMethod, MoveOperationLog } from '@/lib/games/saved-game-types';

type UseMoveOperationTrackerOptions = {
  initialLogs?: MoveOperationLog[];
};

/**
 * Hook for tracking per-move operation metadata (input method, peek count, undo count).
 *
 * Each entry in the logs array corresponds to one player move.
 * Counters (peekCount, undoCount) accumulate during a move and reset on commit.
 */
export function useMoveOperationTracker({ initialLogs }: UseMoveOperationTrackerOptions = {}) {
  const [logs, setLogs] = useState<MoveOperationLog[]>(initialLogs ?? []);
  const peekCountRef = useRef(0);
  const undoCountRef = useRef(0);
  const movePeekCountRef = useRef(0);
  const invalidCountRef = useRef(0);

  // Reset every counter that accumulates during a single move. Called from
  // commit / undo / truncate / setLogsTo so the ref state stays in sync
  // with the visible log table. Centralized to avoid forgetting any one
  // counter when the list grows again.
  const resetCounters = useCallback(() => {
    peekCountRef.current = 0;
    undoCountRef.current = 0;
    movePeekCountRef.current = 0;
    invalidCountRef.current = 0;
  }, []);

  /** Increment peek counter for the current move. */
  const recordPeek = useCallback(() => {
    peekCountRef.current += 1;
  }, []);

  /** Increment undo counter for the current move. */
  const recordUndo = useCallback(() => {
    undoCountRef.current += 1;
  }, []);

  /** Increment move-peek counter for the current move (viewing legal moves hint). */
  const recordMovePeek = useCallback(() => {
    movePeekCountRef.current += 1;
  }, []);

  /** Increment invalid-attempt counter for the current move. */
  const recordInvalid = useCallback(() => {
    invalidCountRef.current += 1;
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
      };
      setLogs((prev) => [...prev, entry]);
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
   */
  const handleUndoLog = useCallback(() => {
    setLogs((prev) => prev.slice(0, -1));
    peekCountRef.current = 0;
    movePeekCountRef.current = 0;
    invalidCountRef.current = 0;
  }, []);

  /**
   * Truncate logs to the specified count and reset current counters.
   * Used when restarting from a specific position.
   */
  const truncateLogs = useCallback(
    (count: number) => {
      setLogs((prev) => prev.slice(0, count));
      resetCounters();
    },
    [resetCounters]
  );

  /**
   * Replace all logs with the given array and reset counters.
   * Used to restore logs from a loaded game.
   */
  const setLogsTo = useCallback(
    (newLogs: MoveOperationLog[]) => {
      setLogs(newLogs);
      resetCounters();
    },
    [resetCounters]
  );

  return {
    logs,
    recordPeek,
    recordUndo,
    recordMovePeek,
    recordInvalid,
    commitMove,
    handleUndoLog,
    truncateLogs,
    setLogsTo,
  };
}
