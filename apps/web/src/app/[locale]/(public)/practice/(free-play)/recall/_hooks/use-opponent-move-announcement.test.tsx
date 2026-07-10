import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MoveLogEntry } from '../_lib';
import { useOpponentMoveAnnouncement } from './use-opponent-move-announcement';

function entry(status: MoveLogEntry['status'], move = 'e5', isWhiteMove = false): MoveLogEntry {
  return { moveNumber: 1, isWhiteMove, move, status };
}

function setup(initialEntries: MoveLogEntry[] = [], durationMs = 1000) {
  return renderHook(({ entries }) => useOpponentMoveAnnouncement({ entries, durationMs }), {
    initialProps: { entries: initialEntries },
  });
}

describe('useOpponentMoveAnnouncement', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('announces a newly appended auto entry with its formatted notation', () => {
    const first = entry('correct', 'e4', true);
    const { result, rerender } = setup([first]);
    expect(result.current.active).toBe(false);

    rerender({ entries: [first, entry('auto', 'e5')] });

    expect(result.current.active).toBe(true);
    expect(result.current.notation).toBe('1... e5');
  });

  it('ignores appended non-auto entries', () => {
    const { result, rerender } = setup([]);

    rerender({ entries: [entry('correct', 'e4', true)] });

    expect(result.current.active).toBe(false);
    expect(result.current.notation).toBeNull();
  });

  it('auto-dismisses after durationMs', () => {
    const { result, rerender } = setup([], 1000);
    rerender({ entries: [entry('auto')] });
    expect(result.current.active).toBe(true);

    act(() => vi.advanceTimersByTime(1000));

    expect(result.current.active).toBe(false);
  });

  it('dismisses on demand (board reveal)', () => {
    const { result, rerender } = setup([], 0); // 0 → never auto-dismiss
    rerender({ entries: [entry('auto')] });
    expect(result.current.active).toBe(true);

    act(() => result.current.dismiss());

    expect(result.current.active).toBe(false);
  });

  it('does not announce the pre-existing tail on mount', () => {
    const { result } = setup([entry('auto')]);
    expect(result.current.active).toBe(false);
  });
});
