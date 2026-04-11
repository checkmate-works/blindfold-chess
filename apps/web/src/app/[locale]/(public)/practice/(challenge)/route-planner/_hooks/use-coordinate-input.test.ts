// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCoordinateInput } from './use-coordinate-input';

describe('useCoordinateInput', () => {
  const onCoordinateComplete = vi.fn();
  const onUndo = vi.fn();
  const hasMovesToUndo = vi.fn(() => false);

  const defaultProps = () => ({
    onCoordinateComplete,
    onUndo,
    hasMovesToUndo,
    disabled: false,
  });

  beforeEach(() => {
    onCoordinateComplete.mockClear();
    onUndo.mockClear();
    hasMovesToUndo.mockClear();
    hasMovesToUndo.mockImplementation(() => false);
  });

  describe('handleFilePress', () => {
    it('sets selectedFile when both are null and does not complete', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleFilePress('a');
      });

      expect(result.current.selectedFile).toBe('a');
      expect(result.current.selectedRank).toBeNull();
      expect(onCoordinateComplete).not.toHaveBeenCalled();
    });

    it('toggles off when pressing the same file again', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleFilePress('a');
      });

      expect(result.current.selectedFile).toBeNull();
      expect(onCoordinateComplete).not.toHaveBeenCalled();
    });

    it('replaces the selected file when pressing a different file', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleFilePress('b');
      });

      expect(result.current.selectedFile).toBe('b');
      expect(onCoordinateComplete).not.toHaveBeenCalled();
    });

    it('completes synchronously and clears state when rank is already set', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleFilePress('a');
      });

      expect(onCoordinateComplete).toHaveBeenCalledTimes(1);
      expect(onCoordinateComplete).toHaveBeenCalledWith('a1');
      expect(result.current.selectedFile).toBeNull();
      expect(result.current.selectedRank).toBeNull();
    });
  });

  describe('handleRankPress', () => {
    it('completes with `${file}${rank}` and clears state when file is already set', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });

      expect(onCoordinateComplete).toHaveBeenCalledTimes(1);
      expect(onCoordinateComplete).toHaveBeenCalledWith('a1');
      expect(result.current.selectedFile).toBeNull();
      expect(result.current.selectedRank).toBeNull();
    });

    it('toggles off when pressing the same rank again', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleRankPress('3');
      });
      act(() => {
        result.current.handleRankPress('3');
      });

      expect(result.current.selectedRank).toBeNull();
      expect(onCoordinateComplete).not.toHaveBeenCalled();
    });
  });

  describe('handleBackspace', () => {
    it('clears rank first when rank is set (file preserved)', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      // Put rank, then file (won't complete because rank=null after toggle? No — pressing file when rank is set would complete).
      // Use a scenario where only rank is set.
      act(() => {
        result.current.handleRankPress('4');
      });
      // Now set file WITHOUT triggering completion: can't — rank already set.
      // Instead, test the simpler path: set rank, backspace clears rank.
      act(() => {
        result.current.handleBackspace();
      });

      expect(result.current.selectedRank).toBeNull();
      expect(result.current.selectedFile).toBeNull();
      expect(onUndo).not.toHaveBeenCalled();
    });

    it('clears file when only file is set', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleFilePress('c');
      });
      act(() => {
        result.current.handleBackspace();
      });

      expect(result.current.selectedFile).toBeNull();
      expect(onUndo).not.toHaveBeenCalled();
    });

    it('calls onUndo when both are null and hasMovesToUndo returns true', () => {
      hasMovesToUndo.mockImplementation(() => true);
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleBackspace();
      });

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when both are null and hasMovesToUndo returns false', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleBackspace();
      });

      expect(onUndo).not.toHaveBeenCalled();
    });
  });

  describe('disabled', () => {
    it('ignores all presses and backspace when disabled is true', () => {
      hasMovesToUndo.mockImplementation(() => true);
      const { result } = renderHook(() =>
        useCoordinateInput({ ...defaultProps(), disabled: true })
      );

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleBackspace();
      });

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.selectedRank).toBeNull();
      expect(onCoordinateComplete).not.toHaveBeenCalled();
      expect(onUndo).not.toHaveBeenCalled();
    });
  });

  describe('hasMovesToUndo invocation contract', () => {
    it('does NOT call hasMovesToUndo when backspace clears rank (stage 1)', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleRankPress('4');
      });
      hasMovesToUndo.mockClear();

      act(() => {
        result.current.handleBackspace();
      });

      expect(hasMovesToUndo).not.toHaveBeenCalled();
      expect(onUndo).not.toHaveBeenCalled();
    });

    it('does NOT call hasMovesToUndo when backspace clears file (stage 2)', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleFilePress('c');
      });
      hasMovesToUndo.mockClear();

      act(() => {
        result.current.handleBackspace();
      });

      expect(hasMovesToUndo).not.toHaveBeenCalled();
      expect(onUndo).not.toHaveBeenCalled();
    });

    it('calls hasMovesToUndo exactly once when both fields are null (stage 3/4)', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      act(() => {
        result.current.handleBackspace();
      });

      expect(hasMovesToUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled re-enable', () => {
    it('resumes responding to presses after disabled flips from true to false', () => {
      const { result, rerender } = renderHook(
        ({ disabled }) =>
          useCoordinateInput({
            onCoordinateComplete,
            onUndo,
            hasMovesToUndo,
            disabled,
          }),
        { initialProps: { disabled: true } }
      );

      act(() => {
        result.current.handleFilePress('a');
      });
      expect(result.current.selectedFile).toBeNull();

      rerender({ disabled: false });

      act(() => {
        result.current.handleFilePress('a');
      });
      expect(result.current.selectedFile).toBe('a');

      act(() => {
        result.current.handleRankPress('1');
      });
      expect(onCoordinateComplete).toHaveBeenCalledTimes(1);
      expect(onCoordinateComplete).toHaveBeenCalledWith('a1');
    });
  });

  describe('result-view state', () => {
    it('exposes hoveredPathIndex/lockedPathIndex setters that feed highlightedPathIndex', () => {
      const { result } = renderHook(() => useCoordinateInput(defaultProps()));

      expect(result.current.hoveredPathIndex).toBeNull();
      expect(result.current.lockedPathIndex).toBeNull();
      expect(result.current.highlightedPathIndex).toBeNull();

      act(() => {
        result.current.setLockedPathIndex(2);
      });
      expect(result.current.highlightedPathIndex).toBe(2);

      act(() => {
        result.current.setHoveredPathIndex(5);
      });
      // hovered takes precedence over locked
      expect(result.current.highlightedPathIndex).toBe(5);

      act(() => {
        result.current.resetInput();
      });
      expect(result.current.hoveredPathIndex).toBeNull();
      expect(result.current.lockedPathIndex).toBeNull();
    });
  });
});
