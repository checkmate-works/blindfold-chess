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
