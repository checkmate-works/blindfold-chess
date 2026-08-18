// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePgnReplay } from './use-pgn-replay';

/** A short real game, so the FEN derivation runs rather than being stubbed. */
const MOVES = ['e4', 'e5', 'Nf3', 'Nc6'] as const;
const LAST_INDEX = MOVES.length - 1;

describe('usePgnReplay', () => {
  it('opens at the final position by default', () => {
    const { result } = renderHook(() => usePgnReplay({ moves: MOVES }));

    expect(result.current.index).toBe(LAST_INDEX);
    expect(result.current.isAtEnd).toBe(true);
  });

  it('opens at the seeded position when given a number', () => {
    const { result } = renderHook(() => usePgnReplay({ moves: MOVES, initialIndex: 1 }));

    expect(result.current.index).toBe(1);
  });

  // The embed surface seeds this from `?ply=`, where a blogger can write any
  // integer. Clamping only the rendered value left the stored cursor at the
  // raw number, so stepping back walked it down from there — hundreds of
  // clicks on a board that never moved.
  it('steps back immediately from a seed past the end of the game', () => {
    const { result } = renderHook(() => usePgnReplay({ moves: MOVES, initialIndex: 999 }));

    expect(result.current.index).toBe(LAST_INDEX);

    act(() => result.current.previous());

    expect(result.current.index).toBe(LAST_INDEX - 1);
  });

  it('steps forward immediately from a seed below the start', () => {
    const { result } = renderHook(() => usePgnReplay({ moves: MOVES, initialIndex: -50 }));

    expect(result.current.index).toBe(-1);

    act(() => result.current.next());

    expect(result.current.index).toBe(0);
  });

  // The pre-existing half of the same defect: a cursor parked at the end of a
  // long line stays there in state when the caller swaps in a shorter one.
  it('steps back immediately after the line shrinks under the cursor', () => {
    const { rerender, result } = renderHook(({ moves }) => usePgnReplay({ moves }), {
      initialProps: { moves: MOVES as readonly string[] },
    });

    expect(result.current.index).toBe(LAST_INDEX);

    rerender({ moves: ['d4'] });
    expect(result.current.index).toBe(0);

    act(() => result.current.previous());

    expect(result.current.index).toBe(-1);
  });

  it('keeps the cursor inside the line however far a step is repeated', () => {
    const { result } = renderHook(() => usePgnReplay({ moves: MOVES, initialIndex: 'start' }));

    act(() => {
      result.current.previous();
      result.current.previous();
    });
    expect(result.current.index).toBe(-1);

    act(() => result.current.toEnd());
    act(() => {
      result.current.next();
      result.current.next();
    });
    expect(result.current.index).toBe(LAST_INDEX);
  });

  it('clamps an out-of-range jump', () => {
    const { result } = renderHook(() => usePgnReplay({ moves: MOVES }));

    act(() => result.current.toIndex(99));
    expect(result.current.index).toBe(LAST_INDEX);

    act(() => result.current.toIndex(-99));
    expect(result.current.index).toBe(-1);
  });

  it('reports an empty line as both start and end without replaying anything', () => {
    const { result } = renderHook(() => usePgnReplay({ moves: [], initialIndex: 5 }));

    expect(result.current.index).toBe(-1);
    expect(result.current.total).toBe(0);
    expect(result.current.lastMove).toBeNull();
  });
});
