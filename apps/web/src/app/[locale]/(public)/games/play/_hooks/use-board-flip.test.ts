// @vitest-environment jsdom
import type { Side } from '@blindfold-chess/types';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useBoardFlip } from './use-board-flip';

describe('useBoardFlip', () => {
  describe('when playerSide is white', () => {
    it('should not flip the board by default', () => {
      const { result } = renderHook(() => useBoardFlip({ playerSide: 'white' }));

      expect(result.current.isBoardFlipped).toBe(false);
      expect(result.current.effectiveFlipped).toBe(false);
    });

    it('should flip the board when toggled', () => {
      const { result } = renderHook(() => useBoardFlip({ playerSide: 'white' }));

      act(() => {
        result.current.toggleFlip();
      });

      expect(result.current.isBoardFlipped).toBe(true);
      expect(result.current.effectiveFlipped).toBe(true);
    });

    it('should return to default orientation when toggled twice', () => {
      const { result } = renderHook(() => useBoardFlip({ playerSide: 'white' }));

      act(() => {
        result.current.toggleFlip();
      });
      act(() => {
        result.current.toggleFlip();
      });

      expect(result.current.isBoardFlipped).toBe(false);
      expect(result.current.effectiveFlipped).toBe(false);
    });
  });

  describe('initialFlipped seed', () => {
    it('should start flipped when initialFlipped is true (white side)', () => {
      const { result } = renderHook(() =>
        useBoardFlip({ playerSide: 'white', initialFlipped: true })
      );

      expect(result.current.isBoardFlipped).toBe(true);
      expect(result.current.effectiveFlipped).toBe(true);
    });

    it('should let initialFlipped invert the black-side default (white at bottom)', () => {
      const { result } = renderHook(() =>
        useBoardFlip({ playerSide: 'black', initialFlipped: true })
      );

      // Black defaults to effectiveFlipped=true; seeding isBoardFlipped=true
      // inverts it to false (white at the bottom).
      expect(result.current.isBoardFlipped).toBe(true);
      expect(result.current.effectiveFlipped).toBe(false);
    });

    it('should default to false when initialFlipped is omitted', () => {
      const { result } = renderHook(() => useBoardFlip({ playerSide: 'white' }));

      expect(result.current.isBoardFlipped).toBe(false);
    });
  });

  describe('toggleFlip reference stability', () => {
    it('should return the same toggleFlip function reference across renders', () => {
      const { result, rerender } = renderHook(() => useBoardFlip({ playerSide: 'white' }));

      const firstToggleFlip = result.current.toggleFlip;

      rerender();

      expect(result.current.toggleFlip).toBe(firstToggleFlip);
    });
  });

  describe('multiple toggles', () => {
    it('should be flipped after an odd number of toggles (3 times)', () => {
      const { result } = renderHook(() => useBoardFlip({ playerSide: 'white' }));

      act(() => {
        result.current.toggleFlip();
      });
      act(() => {
        result.current.toggleFlip();
      });
      act(() => {
        result.current.toggleFlip();
      });

      expect(result.current.isBoardFlipped).toBe(true);
      expect(result.current.effectiveFlipped).toBe(true);
    });
  });

  describe('when playerSide changes', () => {
    it('should recalculate effectiveFlipped when playerSide changes from white to black', () => {
      const { result, rerender } = renderHook(
        ({ playerSide }: { playerSide: Side }) => useBoardFlip({ playerSide }),
        { initialProps: { playerSide: 'white' as Side } }
      );

      // White side: isBoardFlipped=false, effectiveFlipped=false
      expect(result.current.effectiveFlipped).toBe(false);

      // Change to black side without toggling
      rerender({ playerSide: 'black' });

      // Black side: isBoardFlipped=false, effectiveFlipped=true (inverted)
      expect(result.current.isBoardFlipped).toBe(false);
      expect(result.current.effectiveFlipped).toBe(true);
    });

    it('should preserve isBoardFlipped state when playerSide changes', () => {
      const { result, rerender } = renderHook(
        ({ playerSide }: { playerSide: Side }) => useBoardFlip({ playerSide }),
        { initialProps: { playerSide: 'white' as Side } }
      );

      // Toggle once (isBoardFlipped = true)
      act(() => {
        result.current.toggleFlip();
      });

      expect(result.current.isBoardFlipped).toBe(true);
      expect(result.current.effectiveFlipped).toBe(true);

      // Change to black side: isBoardFlipped is still true, effectiveFlipped = !true = false
      rerender({ playerSide: 'black' });

      expect(result.current.isBoardFlipped).toBe(true);
      expect(result.current.effectiveFlipped).toBe(false);
    });

    it('should recalculate effectiveFlipped when playerSide changes from black to white', () => {
      const { result, rerender } = renderHook(
        ({ playerSide }: { playerSide: Side }) => useBoardFlip({ playerSide }),
        { initialProps: { playerSide: 'black' as Side } }
      );

      // Black side: isBoardFlipped=false, effectiveFlipped=true
      expect(result.current.effectiveFlipped).toBe(true);

      // Change to white side
      rerender({ playerSide: 'white' });

      // White side: isBoardFlipped=false, effectiveFlipped=false
      expect(result.current.isBoardFlipped).toBe(false);
      expect(result.current.effectiveFlipped).toBe(false);
    });
  });

  describe('when playerSide is black', () => {
    it('should flip the board by default (black views from bottom)', () => {
      const { result } = renderHook(() => useBoardFlip({ playerSide: 'black' }));

      expect(result.current.isBoardFlipped).toBe(false);
      // Black side defaults to flipped=true (board shows black at bottom)
      // effectiveFlipped inverts isBoardFlipped for black
      expect(result.current.effectiveFlipped).toBe(true);
    });

    it('should unflip the board when toggled (showing white perspective)', () => {
      const { result } = renderHook(() => useBoardFlip({ playerSide: 'black' }));

      act(() => {
        result.current.toggleFlip();
      });

      expect(result.current.isBoardFlipped).toBe(true);
      // For black, toggling reverses: !true = false
      expect(result.current.effectiveFlipped).toBe(false);
    });

    it('should return to black perspective when toggled twice', () => {
      const { result } = renderHook(() => useBoardFlip({ playerSide: 'black' }));

      act(() => {
        result.current.toggleFlip();
      });
      act(() => {
        result.current.toggleFlip();
      });

      expect(result.current.isBoardFlipped).toBe(false);
      expect(result.current.effectiveFlipped).toBe(true);
    });
  });
});
