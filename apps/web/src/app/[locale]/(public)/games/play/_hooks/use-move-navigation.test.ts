// @vitest-environment jsdom
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useMoveNavigation } from './use-move-navigation';

describe('useMoveNavigation', () => {
  const mockMoves = ['e4', 'e5', 'Nf3', 'Nc6'] as AlgebraicNotation[]; // 4 moves

  it('should initialize with default states (latest position)', () => {
    const { result } = renderHook(() => useMoveNavigation({ moves: mockMoves }));

    expect(result.current.currentPosition).toBe(-1);
    expect(result.current.displayFen).toBeNull();
  });

  it('opens on the first move when initialPosition is 0 (move-reference preview)', () => {
    const { result } = renderHook(() =>
      useMoveNavigation({ moves: mockMoves, initialPosition: 0 })
    );

    // Board sits after the first move, with that FEN seeded (no first-frame
    // flash), and "previous" is available back to the pre-branch position.
    expect(result.current.currentPosition).toBe(0);
    expect(result.current.displayFen).not.toBeNull();

    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(1);

    act(() => {
      result.current.navigatePrevious();
    });
    expect(result.current.currentPosition).toBe(0);

    act(() => {
      result.current.navigatePrevious();
    });
    expect(result.current.currentPosition).toBe(-2);
  });

  it('should navigate to start', () => {
    const { result } = renderHook(() => useMoveNavigation({ moves: mockMoves }));

    act(() => {
      result.current.navigateToStart();
    });

    expect(result.current.currentPosition).toBe(-2);
    expect(result.current.displayFen).not.toBeNull();
  });

  it('should navigate to end', () => {
    const { result } = renderHook(() => useMoveNavigation({ moves: mockMoves }));

    act(() => {
      result.current.navigateToStart(); // Go to start first
    });
    expect(result.current.currentPosition).toBe(-2);

    act(() => {
      result.current.navigateToEnd();
    });

    expect(result.current.currentPosition).toBe(-1);
    expect(result.current.displayFen).toBeNull(); // Latest FEN is not stored in displayFen for -1
  });

  it('should navigate next from start', () => {
    const { result } = renderHook(() => useMoveNavigation({ moves: mockMoves }));

    act(() => {
      result.current.navigateToStart();
    });

    act(() => {
      result.current.navigateNext();
    });

    expect(result.current.currentPosition).toBe(0); // Index 0 (first move)
  });

  it('should navigate previous from latest', () => {
    const { result } = renderHook(() => useMoveNavigation({ moves: mockMoves }));

    // From latest (-1, after move 3 = "Nc6"), Previous steps back one ply to
    // index 2 (after "Nf3") — moves.length - 2.
    act(() => {
      result.current.navigatePrevious();
    });

    expect(result.current.currentPosition).toBe(2);
  });

  it('should step through all moves, landing on -1 (not the last index) at the end', () => {
    const { result } = renderHook(() => useMoveNavigation({ moves: mockMoves }));

    act(() => {
      result.current.navigateToStart();
    });
    expect(result.current.currentPosition).toBe(-2);

    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(0);

    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(1);

    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(2);

    // The 4th and final move ("Nc6", index 3 — moves.length - 1) produces the
    // exact same FEN as "latest", so this step lands directly on -1 rather
    // than pausing on index 3. See the regression tests below.
    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(-1);

    // Already at latest — Next is a no-op.
    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(-1);
  });

  // Regression: a ‹ (Previous) then › (Next) round trip used to leave
  // `currentPosition` at the concrete index `moves.length - 1` instead of the
  // `-1` sentinel every consumer relies on for "at latest" — same FEN, but
  // `canBoardMove` (use-play-board-views.tsx) checks `currentPosition === -1`
  // exactly, so the board silently went non-interactive (both click-to-move
  // and drag-and-drop) with no board-native way back, since the Next/End
  // buttons share a disabled state that also treats `moves.length - 1` as
  // "at end".
  describe('regression: returning to latest never leaves currentPosition at moves.length - 1', () => {
    it('a Previous then Next round trip lands back on -1', () => {
      const { result } = renderHook(() => useMoveNavigation({ moves: mockMoves }));

      act(() => {
        result.current.navigatePrevious();
      });
      expect(result.current.currentPosition).toBe(2);

      act(() => {
        result.current.navigateNext();
      });

      expect(result.current.currentPosition).toBe(-1);
      expect(result.current.displayFen).toBeNull();
    });

    it('navigating directly to the last move index (e.g. clicking it in the move list) also normalizes to -1', () => {
      const { result } = renderHook(() => useMoveNavigation({ moves: mockMoves }));

      act(() => {
        result.current.navigateToPosition(mockMoves.length - 1);
      });

      expect(result.current.currentPosition).toBe(-1);
      expect(result.current.displayFen).toBeNull();
    });

    it('holds for a single-move game too (index 0 is both the first and the last move)', () => {
      const { result } = renderHook(() =>
        useMoveNavigation({ moves: ['e4'] as AlgebraicNotation[] })
      );

      act(() => {
        result.current.navigateToStart();
      });
      act(() => {
        result.current.navigateNext();
      });

      expect(result.current.currentPosition).toBe(-1);
    });
  });
});
