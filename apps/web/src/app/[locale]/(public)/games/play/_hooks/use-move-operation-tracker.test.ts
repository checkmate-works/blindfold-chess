// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useMoveOperationTracker } from './use-move-operation-tracker';

describe('useMoveOperationTracker', () => {
  it('should initialize with empty logs by default', () => {
    const { result } = renderHook(() => useMoveOperationTracker());
    expect(result.current.logs).toEqual([]);
  });

  it('should initialize with provided initial logs', () => {
    const initialLogs = [
      {
        inputMethod: 'text' as const,
        peekCount: 1,
        undoCount: 0,
        movePeekCount: 0,
        invalidCount: 0,
      },
      {
        inputMethod: 'button' as const,
        peekCount: 0,
        undoCount: 1,
        movePeekCount: 0,
        invalidCount: 0,
      },
    ];
    const { result } = renderHook(() => useMoveOperationTracker({ initialLogs }));
    expect(result.current.logs).toEqual(initialLogs);
  });

  it('should commit a move with correct input method and zero counters', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.commitMove('button');
    });

    expect(result.current.logs).toEqual([
      { inputMethod: 'button', peekCount: 0, undoCount: 0, movePeekCount: 0, invalidCount: 0 },
    ]);
  });

  it('should track peek count for the current move', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.recordPeek();
      result.current.recordPeek();
      result.current.commitMove('text');
    });

    expect(result.current.logs).toEqual([
      { inputMethod: 'text', peekCount: 2, undoCount: 0, movePeekCount: 0, invalidCount: 0 },
    ]);
  });

  it('should track undo count for the current move', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.recordUndo();
      result.current.commitMove('select');
    });

    expect(result.current.logs).toEqual([
      { inputMethod: 'select', peekCount: 0, undoCount: 1, movePeekCount: 0, invalidCount: 0 },
    ]);
  });

  it('should track both peek and undo counts', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.recordPeek();
      result.current.recordUndo();
      result.current.recordPeek();
      result.current.commitMove('text-autocomplete');
    });

    expect(result.current.logs).toEqual([
      {
        inputMethod: 'text-autocomplete',
        peekCount: 2,
        undoCount: 1,
        movePeekCount: 0,
        invalidCount: 0,
      },
    ]);
  });

  it('should reset counters after commit', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.recordPeek();
      result.current.recordUndo();
      result.current.commitMove('button');
    });

    act(() => {
      result.current.commitMove('text');
    });

    expect(result.current.logs).toEqual([
      { inputMethod: 'button', peekCount: 1, undoCount: 1, movePeekCount: 0, invalidCount: 0 },
      { inputMethod: 'text', peekCount: 0, undoCount: 0, movePeekCount: 0, invalidCount: 0 },
    ]);
  });

  it('should accumulate multiple moves', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.commitMove('button');
    });

    act(() => {
      result.current.recordPeek();
      result.current.commitMove('text');
    });

    act(() => {
      result.current.recordUndo();
      result.current.recordPeek();
      result.current.commitMove('select');
    });

    expect(result.current.logs).toHaveLength(3);
    expect(result.current.logs[0]).toEqual({
      inputMethod: 'button',
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 0,
      invalidCount: 0,
    });
    expect(result.current.logs[1]).toEqual({
      inputMethod: 'text',
      peekCount: 1,
      undoCount: 0,
      movePeekCount: 0,
      invalidCount: 0,
    });
    expect(result.current.logs[2]).toEqual({
      inputMethod: 'select',
      peekCount: 1,
      undoCount: 1,
      movePeekCount: 0,
      invalidCount: 0,
    });
  });

  it('should remove the last log entry and reset counters on handleUndoLog', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.commitMove('button');
      result.current.commitMove('text');
    });

    expect(result.current.logs).toHaveLength(2);

    act(() => {
      result.current.recordPeek(); // peek during undone move's thinking time
      result.current.handleUndoLog();
    });

    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0]).toEqual({
      inputMethod: 'button',
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 0,
      invalidCount: 0,
    });

    // Counters should be reset after undo, so next commit starts fresh
    act(() => {
      result.current.commitMove('text');
    });

    expect(result.current.logs).toHaveLength(2);
    expect(result.current.logs[1]).toEqual({
      inputMethod: 'text',
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 0,
      invalidCount: 0,
    });
  });

  it('should handle handleUndoLog on empty logs gracefully', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.handleUndoLog();
    });

    expect(result.current.logs).toEqual([]);
  });

  it('should discard peeks on undo but track undo count on next move', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    // Player makes a move
    act(() => {
      result.current.commitMove('button');
    });

    // Player peeks 3 times while thinking about next move, then undoes
    act(() => {
      result.current.recordPeek();
      result.current.recordPeek();
      result.current.recordPeek();
      // Undo: removes last log and resets counters (peeks are discarded)
      result.current.handleUndoLog();
      // Record the undo event for the next move
      result.current.recordUndo();
    });

    expect(result.current.logs).toHaveLength(0);

    // Player makes a new move — should have undoCount=1 but peekCount=0
    act(() => {
      result.current.commitMove('text');
    });

    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0]).toEqual({
      inputMethod: 'text',
      peekCount: 0,
      undoCount: 1,
      movePeekCount: 0,
      invalidCount: 0,
    });
  });

  it('accumulates undoCount across consecutive undos (regression: two undos must record 2, not 1)', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    // Player commits move 1, then move 2 (two log entries on the stack).
    act(() => {
      result.current.commitMove('text');
      result.current.commitMove('text');
    });
    expect(result.current.logs).toHaveLength(2);

    // First Undo: mirror the real `handleUndo` flow — pop the last log, then
    // record the undo itself for the next move.
    act(() => {
      result.current.handleUndoLog();
      result.current.recordUndo();
    });
    expect(result.current.logs).toHaveLength(1);

    // Second Undo, immediately, before the player commits anything new.
    // The previous undo's increment must survive: handleUndoLog must not
    // zero undoCountRef.
    act(() => {
      result.current.handleUndoLog();
      result.current.recordUndo();
    });
    expect(result.current.logs).toHaveLength(0);

    // When the player finally commits a new move, both undos should be on it.
    act(() => {
      result.current.commitMove('text');
    });

    expect(result.current.logs).toEqual([
      { inputMethod: 'text', peekCount: 0, undoCount: 2, movePeekCount: 0, invalidCount: 0 },
    ]);
  });

  it('should track movePeekCount for the current move', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.recordMovePeek();
      result.current.recordMovePeek();
      result.current.commitMove('text');
    });

    expect(result.current.logs[0]).toEqual({
      inputMethod: 'text',
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 2,
      invalidCount: 0,
    });
  });

  it('should track invalidCount for the current move and reset on commit', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      // Three failed submissions before the successful one.
      result.current.recordInvalid();
      result.current.recordInvalid();
      result.current.recordInvalid();
      result.current.commitMove('text');
    });

    expect(result.current.logs[0]).toEqual({
      inputMethod: 'text',
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 0,
      invalidCount: 3,
    });

    // Counters reset after commit — the next move should start at 0.
    act(() => {
      result.current.commitMove('button');
    });

    expect(result.current.logs[1]).toEqual({
      inputMethod: 'button',
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 0,
      invalidCount: 0,
    });
  });

  it('discards in-flight invalidCount on undo (matches existing peek/undo policy)', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.commitMove('text');
      result.current.recordInvalid();
      result.current.recordInvalid();
      result.current.handleUndoLog();
      // The two invalids belonged to the move being undone — they vanish
      // along with the move. The next commit starts fresh.
      result.current.commitMove('button');
    });

    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0]).toEqual({
      inputMethod: 'button',
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 0,
      invalidCount: 0,
    });
  });

  it('captures the rejected move texts passed to recordInvalid, in order', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.recordInvalid('Nf3');
      result.current.recordInvalid('Bb4');
      result.current.commitMove('text');
    });

    expect(result.current.logs[0]).toEqual({
      inputMethod: 'text',
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 0,
      invalidCount: 2,
      invalidAttempts: ['Nf3', 'Bb4'],
    });
  });

  it('counts text-less attempts (board mis-grabs) but records no text for them', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.recordInvalid(); // board mis-grab → count only
      result.current.recordInvalid('Qd5'); // typed → count + text
      result.current.commitMove('text');
    });

    // count covers both paths; attempts holds only the captured text.
    expect(result.current.logs[0]).toEqual({
      inputMethod: 'text',
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 0,
      invalidCount: 2,
      invalidAttempts: ['Qd5'],
    });
  });

  it('discards captured attempts on undo', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.commitMove('text');
      result.current.recordInvalid('Nf3');
      result.current.handleUndoLog();
      result.current.commitMove('button');
    });

    expect(result.current.logs).toHaveLength(1);
    // No invalidAttempts on the fresh entry (toEqual ignores the undefined key).
    expect(result.current.logs[0]).toEqual({
      inputMethod: 'button',
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 0,
      invalidCount: 0,
    });
    expect(result.current.logs[0].invalidAttempts).toBeUndefined();
  });

  it('caps captured attempt texts at 20 while the count keeps climbing', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      for (let i = 0; i < 25; i++) result.current.recordInvalid(`m${i}`);
      result.current.commitMove('text');
    });

    expect(result.current.logs[0].invalidCount).toBe(25);
    expect(result.current.logs[0].invalidAttempts).toHaveLength(20);
    expect(result.current.logs[0].invalidAttempts?.[0]).toBe('m0');
  });

  describe('totals (monotonic lifetime counters — issue #95)', () => {
    it('starts at zero and counts every recorded operation', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      expect(result.current.totals).toEqual({
        peeks: 0,
        movePeeks: 0,
        undos: 0,
        invalidMoves: 0,
      });

      act(() => {
        result.current.recordPeek();
        result.current.recordPeek();
        result.current.recordMovePeek();
        result.current.recordInvalid('Rc8');
        result.current.recordUndo();
        result.current.commitMove('text');
      });

      expect(result.current.totals).toEqual({
        peeks: 2,
        movePeeks: 1,
        undos: 1,
        invalidMoves: 1,
      });
    });

    it('survives undo: peek → undo → replay cannot launder the peek total', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      // Peek 3 times, commit, then undo the move and replay it cleanly —
      // the per-move log ends with peekCount 0, but the total keeps the 3.
      act(() => {
        result.current.recordPeek();
        result.current.recordPeek();
        result.current.recordPeek();
        result.current.commitMove('text');
        result.current.handleUndoLog();
        result.current.recordUndo();
        result.current.commitMove('text');
      });

      expect(result.current.logs).toEqual([
        { inputMethod: 'text', peekCount: 0, undoCount: 1, movePeekCount: 0, invalidCount: 0 },
      ]);
      expect(result.current.totals).toEqual({
        peeks: 3,
        movePeeks: 0,
        undos: 1,
        invalidMoves: 0,
      });
    });

    it('keeps in-flight invalid attempts counted when an undo discards them', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      act(() => {
        result.current.commitMove('text');
        result.current.recordInvalid('Rc8');
        result.current.recordInvalid('Re1');
        result.current.handleUndoLog();
        result.current.recordUndo();
        result.current.commitMove('button');
      });

      // Per-move view forgot the two invalids; the lifetime total did not.
      expect(result.current.logs[0].invalidCount).toBe(0);
      expect(result.current.totals.invalidMoves).toBe(2);
      expect(result.current.totals.undos).toBe(1);
    });

    it('survives truncateLogs (restart-from-position)', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      act(() => {
        result.current.recordPeek();
        result.current.commitMove('text');
        result.current.recordPeek();
        result.current.truncateLogs(0);
      });

      expect(result.current.logs).toEqual([]);
      expect(result.current.totals.peeks).toBe(2);
    });

    it('restores via setTotalsTo and keeps accumulating from there', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      act(() => {
        result.current.setTotalsTo({ peeks: 4, movePeeks: 2, undos: 3, invalidMoves: 1 });
        result.current.recordPeek();
      });

      expect(result.current.totals).toEqual({
        peeks: 5,
        movePeeks: 2,
        undos: 3,
        invalidMoves: 1,
      });
    });
  });

  describe('truncateLogs', () => {
    it('should truncate logs to the specified count', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      act(() => {
        result.current.commitMove('button');
        result.current.commitMove('text');
        result.current.commitMove('select');
      });

      expect(result.current.logs).toHaveLength(3);

      act(() => {
        result.current.truncateLogs(1);
      });

      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0]).toEqual({
        inputMethod: 'button',
        peekCount: 0,
        undoCount: 0,
        movePeekCount: 0,
        invalidCount: 0,
      });
    });

    it('should reset counters when truncating', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      act(() => {
        result.current.commitMove('button');
        result.current.recordPeek();
        result.current.recordUndo();
        result.current.truncateLogs(1);
      });

      // Counters should be reset, so next commit starts fresh
      act(() => {
        result.current.commitMove('text');
      });

      expect(result.current.logs).toHaveLength(2);
      expect(result.current.logs[1]).toEqual({
        inputMethod: 'text',
        peekCount: 0,
        undoCount: 0,
        movePeekCount: 0,
        invalidCount: 0,
      });
    });

    it('should handle truncating to zero', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      act(() => {
        result.current.commitMove('button');
        result.current.commitMove('text');
        result.current.truncateLogs(0);
      });

      expect(result.current.logs).toEqual([]);
    });

    it('should handle truncating beyond current length (no-op)', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      act(() => {
        result.current.commitMove('button');
        result.current.truncateLogs(5);
      });

      expect(result.current.logs).toHaveLength(1);
    });
  });

  describe('setLogsTo', () => {
    it('should replace all logs with the given array', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      act(() => {
        result.current.commitMove('button');
        result.current.commitMove('text');
      });

      expect(result.current.logs).toHaveLength(2);

      const newLogs = [
        { inputMethod: 'select' as const, peekCount: 3, undoCount: 1, movePeekCount: 2 },
      ];

      act(() => {
        result.current.setLogsTo(newLogs);
      });

      expect(result.current.logs).toEqual(newLogs);
    });

    it('should reset counters when replacing logs', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      act(() => {
        result.current.recordPeek();
        result.current.recordUndo();
        result.current.recordMovePeek();
        result.current.setLogsTo([]);
      });

      // Counters should be reset, so next commit starts fresh
      act(() => {
        result.current.commitMove('text');
      });

      expect(result.current.logs).toEqual([
        { inputMethod: 'text', peekCount: 0, undoCount: 0, movePeekCount: 0, invalidCount: 0 },
      ]);
    });

    it('should work correctly after setLogsTo followed by new commits', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      const restoredLogs = [
        {
          inputMethod: 'text' as const,
          peekCount: 1,
          undoCount: 0,
          movePeekCount: 0,
          invalidCount: 0,
        },
        {
          inputMethod: 'button' as const,
          peekCount: 0,
          undoCount: 0,
          movePeekCount: 0,
          invalidCount: 0,
        },
      ];

      act(() => {
        result.current.setLogsTo(restoredLogs);
      });

      // Simulate playing a new move after restoration
      act(() => {
        result.current.recordPeek();
        result.current.commitMove('select');
      });

      expect(result.current.logs).toHaveLength(3);
      expect(result.current.logs[0]).toEqual(restoredLogs[0]);
      expect(result.current.logs[1]).toEqual(restoredLogs[1]);
      expect(result.current.logs[2]).toEqual({
        inputMethod: 'select',
        peekCount: 1,
        undoCount: 0,
        movePeekCount: 0,
        invalidCount: 0,
      });
    });

    it('should allow undo after setLogsTo', () => {
      const { result } = renderHook(() => useMoveOperationTracker());

      const restoredLogs = [
        {
          inputMethod: 'text' as const,
          peekCount: 0,
          undoCount: 0,
          movePeekCount: 0,
          invalidCount: 0,
        },
        {
          inputMethod: 'button' as const,
          peekCount: 1,
          undoCount: 0,
          movePeekCount: 0,
          invalidCount: 0,
        },
      ];

      act(() => {
        result.current.setLogsTo(restoredLogs);
      });

      act(() => {
        result.current.handleUndoLog();
        result.current.recordUndo();
      });

      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0]).toEqual(restoredLogs[0]);

      // Next move should have undoCount=1
      act(() => {
        result.current.commitMove('text');
      });

      expect(result.current.logs[1]).toEqual({
        inputMethod: 'text',
        peekCount: 0,
        undoCount: 1,
        movePeekCount: 0,
        invalidCount: 0,
      });
    });
  });
});
