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
   * Handle undo: remove the last player's log entry and reset current counters.
   * Called when the player undoes a move (which removes both the player and AI moves).
   *
   * Design note: Counters (peekCount, undoCount, invalidCount, movePeekCount)
   * accumulated during the current turn are intentionally discarded on undo.
   * This follows the principle that "undo = the move never happened," so any
   * operations performed while considering that move are treated as irrelevant.
   * The caller should call `recordUndo()` after `handleUndoLog()` to track the
   * undo itself on the next move.
   */
  const handleUndoLog = useCallback(() => {
    setLogs((prev) => prev.slice(0, -1));
    resetCounters();
  }, [resetCounters]);

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
