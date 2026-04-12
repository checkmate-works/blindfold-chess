// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStagedCoordinate } from './use-staged-coordinate';

describe('useStagedCoordinate', () => {
  describe('initial state', () => {
    it('starts with both slots null and hasStage() === false', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.selectedRank).toBeNull();
      expect(result.current.hasStage()).toBe(false);
    });
  });

  describe('pressFile', () => {
    it('sets selectedFile when both are null and returns the new state', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      let returned!: ReturnType<typeof result.current.pressFile>;
      act(() => {
        returned = result.current.pressFile('a');
      });

      expect(returned).toEqual({ selectedFile: 'a', selectedRank: null });
      expect(result.current.selectedFile).toBe('a');
      expect(result.current.selectedRank).toBeNull();
    });

    it('toggles off when pressing the same file again', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      act(() => {
        result.current.pressFile('a');
      });
      let returned!: ReturnType<typeof result.current.pressFile>;
      act(() => {
        returned = result.current.pressFile('a');
      });

      expect(returned).toEqual({ selectedFile: null, selectedRank: null });
      expect(result.current.selectedFile).toBeNull();
    });

    it('replaces the selected file when pressing a different file', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      act(() => {
        result.current.pressFile('a');
      });
      let returned!: ReturnType<typeof result.current.pressFile>;
      act(() => {
        returned = result.current.pressFile('b');
      });

      expect(returned).toEqual({ selectedFile: 'b', selectedRank: null });
      expect(result.current.selectedFile).toBe('b');
    });

    it('returns both slots set when rank is already set (does NOT auto-clear)', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      act(() => {
        result.current.pressRank('1');
      });
      let returned!: ReturnType<typeof result.current.pressFile>;
      act(() => {
        returned = result.current.pressFile('a');
      });

      expect(returned).toEqual({ selectedFile: 'a', selectedRank: '1' });
      // State reflects both set — caller decides when to clear.
      expect(result.current.selectedFile).toBe('a');
      expect(result.current.selectedRank).toBe('1');
    });
  });

  describe('pressRank', () => {
    it('sets selectedRank when both are null', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      let returned!: ReturnType<typeof result.current.pressRank>;
      act(() => {
        returned = result.current.pressRank('3');
      });

      expect(returned).toEqual({ selectedFile: null, selectedRank: '3' });
      expect(result.current.selectedRank).toBe('3');
    });

    it('toggles off when pressing the same rank again', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      act(() => {
        result.current.pressRank('3');
      });
      let returned!: ReturnType<typeof result.current.pressRank>;
      act(() => {
        returned = result.current.pressRank('3');
      });

      expect(returned).toEqual({ selectedFile: null, selectedRank: null });
      expect(result.current.selectedRank).toBeNull();
    });

    it('returns both slots set when file is already set', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      act(() => {
        result.current.pressFile('a');
      });
      let returned!: ReturnType<typeof result.current.pressRank>;
      act(() => {
        returned = result.current.pressRank('1');
      });

      expect(returned).toEqual({ selectedFile: 'a', selectedRank: '1' });
    });
  });

  describe('clearStage', () => {
    it('clears rank first when rank is set, returning true and preserving file', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      act(() => {
        result.current.pressFile('a');
      });
      act(() => {
        result.current.pressRank('1');
      });

      // Both set now
      let cleared!: boolean;
      act(() => {
        cleared = result.current.clearStage();
      });

      expect(cleared).toBe(true);
      expect(result.current.selectedFile).toBe('a');
      expect(result.current.selectedRank).toBeNull();
    });

    it('clears file when only file is set, returning true', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      act(() => {
        result.current.pressFile('c');
      });
      let cleared!: boolean;
      act(() => {
        cleared = result.current.clearStage();
      });

      expect(cleared).toBe(true);
      expect(result.current.selectedFile).toBeNull();
    });

    it('returns false and does nothing when both are null', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      let cleared!: boolean;
      act(() => {
        cleared = result.current.clearStage();
      });

      expect(cleared).toBe(false);
      expect(result.current.selectedFile).toBeNull();
      expect(result.current.selectedRank).toBeNull();
    });
  });

  describe('hasStage', () => {
    it('returns true when either slot is set', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      expect(result.current.hasStage()).toBe(false);

      act(() => {
        result.current.pressFile('a');
      });
      expect(result.current.hasStage()).toBe(true);

      act(() => {
        result.current.pressRank('1');
      });
      expect(result.current.hasStage()).toBe(true);

      act(() => {
        result.current.clearStage();
      });
      // rank cleared, file still set
      expect(result.current.hasStage()).toBe(true);

      act(() => {
        result.current.clearStage();
      });
      expect(result.current.hasStage()).toBe(false);
    });
  });

  describe('resetStage', () => {
    it('clears both slots unconditionally', () => {
      const { result } = renderHook(() => useStagedCoordinate());

      act(() => {
        result.current.pressFile('a');
      });
      act(() => {
        result.current.pressRank('1');
      });

      act(() => {
        result.current.resetStage();
      });

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.selectedRank).toBeNull();
    });
  });

  describe('disabled', () => {
    it('press/clear are all no-ops when disabled is true', () => {
      const { result } = renderHook(() => useStagedCoordinate({ disabled: true }));

      let filePressReturn!: ReturnType<typeof result.current.pressFile>;
      act(() => {
        filePressReturn = result.current.pressFile('a');
      });
      expect(filePressReturn).toEqual({ selectedFile: null, selectedRank: null });

      let rankPressReturn!: ReturnType<typeof result.current.pressRank>;
      act(() => {
        rankPressReturn = result.current.pressRank('1');
      });
      expect(rankPressReturn).toEqual({ selectedFile: null, selectedRank: null });

      let cleared!: boolean;
      act(() => {
        cleared = result.current.clearStage();
      });
      expect(cleared).toBe(false);

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.selectedRank).toBeNull();
    });

    it('clearStage returns false and preserves state when disabled, even with data to clear', () => {
      const { result, rerender } = renderHook(({ disabled }) => useStagedCoordinate({ disabled }), {
        initialProps: { disabled: false },
      });

      // Seed real state while enabled
      act(() => {
        result.current.pressFile('a');
      });
      act(() => {
        result.current.pressRank('1');
      });

      // Flip to disabled
      rerender({ disabled: true });

      let cleared!: boolean;
      act(() => {
        cleared = result.current.clearStage();
      });

      expect(cleared).toBe(false);
      expect(result.current.selectedFile).toBe('a');
      expect(result.current.selectedRank).toBe('1');
    });

    it('press* return the current (unchanged) state when disabled, reflecting existing stage', () => {
      const { result, rerender } = renderHook(({ disabled }) => useStagedCoordinate({ disabled }), {
        initialProps: { disabled: false },
      });

      act(() => {
        result.current.pressFile('a');
      });
      act(() => {
        result.current.pressRank('1');
      });

      rerender({ disabled: true });

      let fileReturn!: ReturnType<typeof result.current.pressFile>;
      act(() => {
        fileReturn = result.current.pressFile('b');
      });
      expect(fileReturn).toEqual({ selectedFile: 'a', selectedRank: '1' });

      let rankReturn!: ReturnType<typeof result.current.pressRank>;
      act(() => {
        rankReturn = result.current.pressRank('2');
      });
      expect(rankReturn).toEqual({ selectedFile: 'a', selectedRank: '1' });

      // State unchanged
      expect(result.current.selectedFile).toBe('a');
      expect(result.current.selectedRank).toBe('1');
    });

    it('resetStage clears both slots even when disabled (ignores disabled flag)', () => {
      const { result, rerender } = renderHook(({ disabled }) => useStagedCoordinate({ disabled }), {
        initialProps: { disabled: false },
      });

      act(() => {
        result.current.pressFile('a');
      });
      act(() => {
        result.current.pressRank('1');
      });

      rerender({ disabled: true });

      act(() => {
        result.current.resetStage();
      });

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.selectedRank).toBeNull();
      expect(result.current.hasStage()).toBe(false);
    });

    it('resumes responding after disabled flips from true to false', () => {
      const { result, rerender } = renderHook(({ disabled }) => useStagedCoordinate({ disabled }), {
        initialProps: { disabled: true },
      });

      act(() => {
        result.current.pressFile('a');
      });
      expect(result.current.selectedFile).toBeNull();

      rerender({ disabled: false });

      act(() => {
        result.current.pressFile('a');
      });
      expect(result.current.selectedFile).toBe('a');
    });
  });
});
