import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMovePlayback } from './use-move-playback';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('useMovePlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle with currentMoveIndex at -1', () => {
    const { result } = renderHook(() =>
      useMovePlayback({ initialFen: START_FEN, moves: ['e4', 'e5'], intervalMs: 100 })
    );

    expect(result.current.currentMoveIndex).toBe(-1);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.hasPlayed).toBe(false);
  });

  it('plays through all moves on a single play() call', () => {
    const { result } = renderHook(() =>
      useMovePlayback({ initialFen: START_FEN, moves: ['e4', 'e5'], intervalMs: 100 })
    );

    act(() => {
      result.current.play();
    });
    // Advance in steps so chained state updates schedule the next interval.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.hasPlayed).toBe(true);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentMoveIndex).toBe(1);
  });

  // Regression: previously, clicking Replay after a completed playback took
  // two clicks to restart — the first click's setTimeout callback captured a
  // stale `currentMoveIndex` value from before `resetPlayback()` applied, and
  // dispatched `playNextMove(moves.length)` which immediately bailed.
  it('restarts playback from the first move on a single Replay click after completion', () => {
    const { result } = renderHook(() =>
      useMovePlayback({ initialFen: START_FEN, moves: ['e4', 'e5'], intervalMs: 100 })
    );

    // First play — run to completion.
    act(() => {
      result.current.play();
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.hasPlayed).toBe(true);
    expect(result.current.currentMoveIndex).toBe(1);

    // Click Replay once.
    act(() => {
      result.current.play();
    });
    // Advance past the initial 0ms setTimeout that schedules the first move.
    act(() => {
      vi.advanceTimersByTime(0);
    });

    // A single click must be enough to restart — currentMoveIndex should
    // advance to 0 (first move played), not stay at -1 (no-op) and not jump
    // to moves.length (stale-closure bail).
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentMoveIndex).toBe(0);
  });
});
