// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDiagonalInput } from './useDiagonalInput';

describe('useDiagonalInput', () => {
  const mockOnBothComplete = vi.fn();

  const defaultProps = {
    onBothComplete: mockOnBothComplete,
    disabled: false,
    allowSingleSquareDiagonal: false,
    allowSingleSquareAntiDiagonal: false,
  };

  beforeEach(() => {
    mockOnBothComplete.mockClear();
  });

  describe('initial state', () => {
    it('should initialize with empty text fields', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      expect(result.current.diagonalStartText).toBe('');
      expect(result.current.diagonalEndText).toBe('');
      expect(result.current.antiDiagonalStartText).toBe('');
      expect(result.current.antiDiagonalEndText).toBe('');
      expect(result.current.activeField).toBe('diagonal');
      expect(result.current.isDiagonalComplete).toBe(false);
      expect(result.current.isAntiDiagonalComplete).toBe(false);
      expect(result.current.areBothComplete).toBe(false);
      expect(result.current.expectingFile).toBe(true);
      expect(result.current.expectingRank).toBe(false);
      expect(result.current.isInputtingStart).toBe(true);
      expect(result.current.isInputtingEnd).toBe(false);
    });
  });

  describe('buildStartText / buildEndText via hook output', () => {
    it('shows start text after entering first file character', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('a');
      });

      expect(result.current.diagonalStartText).toBe('a');
      expect(result.current.diagonalEndText).toBe('');
    });

    it('shows start text after entering file and rank (start square complete)', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });

      expect(result.current.diagonalStartText).toBe('a1');
      expect(result.current.diagonalEndText).toBe('');
    });

    it('shows end text after entering third character (end file)', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleFilePress('h');
      });

      expect(result.current.diagonalStartText).toBe('a1');
      expect(result.current.diagonalEndText).toBe('h');
    });

    it('shows full start and end text after four characters', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleFilePress('h');
      });
      act(() => {
        result.current.handleRankPress('8');
      });

      expect(result.current.diagonalStartText).toBe('a1');
      expect(result.current.diagonalEndText).toBe('h8');
    });
  });

  describe('isInputtingStart / isInputtingEnd flags', () => {
    it('isInputtingStart is true at file1 step', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      expect(result.current.isInputtingStart).toBe(true);
      expect(result.current.isInputtingEnd).toBe(false);
    });

    it('isInputtingStart is true at rank1 step', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('b');
      });

      expect(result.current.isInputtingStart).toBe(true);
      expect(result.current.isInputtingEnd).toBe(false);
      expect(result.current.currentStep).toBe('rank1');
    });

    it('isInputtingEnd is true at file2 step', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('b');
      });
      act(() => {
        result.current.handleRankPress('1');
      });

      expect(result.current.isInputtingStart).toBe(false);
      expect(result.current.isInputtingEnd).toBe(true);
      expect(result.current.currentStep).toBe('file2');
    });

    it('isInputtingEnd is true at rank2 step', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('b');
      });
      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleFilePress('h');
      });

      expect(result.current.isInputtingStart).toBe(false);
      expect(result.current.isInputtingEnd).toBe(true);
      expect(result.current.currentStep).toBe('rank2');
    });
  });

  describe('auto-advance from diagonal to antiDiagonal', () => {
    it('switches activeField to antiDiagonal when diagonal is complete', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleFilePress('h');
      });
      act(() => {
        result.current.handleRankPress('8');
      });

      expect(result.current.isDiagonalComplete).toBe(true);
      expect(result.current.activeField).toBe('antiDiagonal');
    });
  });

  describe('completion callback', () => {
    it('calls onBothComplete when both diagonal and anti-diagonal are complete', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      // Enter diagonal: a1-h8
      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleFilePress('h');
      });
      act(() => {
        result.current.handleRankPress('8');
      });

      // Now activeField should be antiDiagonal
      // Enter anti-diagonal: a8-h1
      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('8');
      });
      act(() => {
        result.current.handleFilePress('h');
      });
      act(() => {
        result.current.handleRankPress('1');
      });

      expect(mockOnBothComplete).toHaveBeenCalledWith('a1-h8', 'a8-h1');
    });
  });

  describe('single square diagonal mode (corner squares)', () => {
    it('treats diagonal as complete after 2 chars when allowSingleSquareDiagonal is true', () => {
      const { result } = renderHook(() =>
        useDiagonalInput({
          ...defaultProps,
          allowSingleSquareDiagonal: true,
        })
      );

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('8');
      });

      expect(result.current.isDiagonalComplete).toBe(true);
      expect(result.current.diagonalStartText).toBe('a8');
      expect(result.current.diagonalEndText).toBe('');
      // Should auto-advance to antiDiagonal
      expect(result.current.activeField).toBe('antiDiagonal');
    });

    it('treats anti-diagonal as complete after 2 chars when allowSingleSquareAntiDiagonal is true', () => {
      const { result } = renderHook(() =>
        useDiagonalInput({
          ...defaultProps,
          allowSingleSquareAntiDiagonal: true,
        })
      );

      // Enter diagonal (4 chars since it's not single)
      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleFilePress('h');
      });
      act(() => {
        result.current.handleRankPress('8');
      });

      // Now enter anti-diagonal as single square
      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });

      expect(result.current.isAntiDiagonalComplete).toBe(true);
      expect(result.current.areBothComplete).toBe(true);
      expect(mockOnBothComplete).toHaveBeenCalledWith('a1-h8', 'a1');
    });

    it('corner a1: single anti-diagonal + full diagonal triggers callback', () => {
      const { result } = renderHook(() =>
        useDiagonalInput({
          ...defaultProps,
          allowSingleSquareAntiDiagonal: true,
        })
      );

      // Diagonal: a1-h8
      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleFilePress('h');
      });
      act(() => {
        result.current.handleRankPress('8');
      });

      // Anti-diagonal: a1 (single)
      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });

      expect(mockOnBothComplete).toHaveBeenCalledWith('a1-h8', 'a1');
    });

    it('corner a8: single diagonal + full anti-diagonal triggers callback', () => {
      const { result } = renderHook(() =>
        useDiagonalInput({
          ...defaultProps,
          allowSingleSquareDiagonal: true,
        })
      );

      // Diagonal: a8 (single)
      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('8');
      });

      // Anti-diagonal: a8-h1
      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('8');
      });
      act(() => {
        result.current.handleFilePress('h');
      });
      act(() => {
        result.current.handleRankPress('1');
      });

      expect(mockOnBothComplete).toHaveBeenCalledWith('a8', 'a8-h1');
    });
  });

  describe('disabled state', () => {
    it('ignores input when disabled', () => {
      const { result } = renderHook(() => useDiagonalInput({ ...defaultProps, disabled: true }));

      act(() => {
        result.current.handleFilePress('a');
      });

      expect(result.current.diagonalStartText).toBe('');
      expect(result.current.currentStep).toBe('file1');
    });

    it('ignores backspace when disabled', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('a');
      });

      expect(result.current.diagonalStartText).toBe('a');

      // Re-render with disabled=true
      const { result: disabledResult } = renderHook(() =>
        useDiagonalInput({ ...defaultProps, disabled: true })
      );

      act(() => {
        disabledResult.current.handleBackspace();
      });

      // Original hook state shouldn't change from disabled backspace
      expect(disabledResult.current.diagonalStartText).toBe('');
    });
  });

  describe('backspace', () => {
    it('removes last character', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });

      expect(result.current.diagonalStartText).toBe('a1');

      act(() => {
        result.current.handleBackspace();
      });

      expect(result.current.diagonalStartText).toBe('a');
      expect(result.current.currentStep).toBe('rank1');
    });

    it('does nothing when chars are empty', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleBackspace();
      });

      expect(result.current.diagonalStartText).toBe('');
      expect(result.current.currentStep).toBe('file1');
    });

    it('removes end text character going back to start complete', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleFilePress('h');
      });

      expect(result.current.diagonalEndText).toBe('h');

      act(() => {
        result.current.handleBackspace();
      });

      expect(result.current.diagonalEndText).toBe('');
      expect(result.current.diagonalStartText).toBe('a1');
      expect(result.current.currentStep).toBe('file2');
    });
  });

  describe('clear', () => {
    it('resets the current field to initial state', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleFilePress('h');
      });

      act(() => {
        result.current.handleClear();
      });

      expect(result.current.diagonalStartText).toBe('');
      expect(result.current.diagonalEndText).toBe('');
      expect(result.current.currentStep).toBe('file1');
    });
  });

  describe('reset', () => {
    it('resets both fields and active field to initial state', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      // Fill diagonal
      act(() => {
        result.current.handleFilePress('a');
      });
      act(() => {
        result.current.handleRankPress('1');
      });
      act(() => {
        result.current.handleFilePress('h');
      });
      act(() => {
        result.current.handleRankPress('8');
      });

      // Fill some anti-diagonal
      act(() => {
        result.current.handleFilePress('b');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.diagonalStartText).toBe('');
      expect(result.current.diagonalEndText).toBe('');
      expect(result.current.antiDiagonalStartText).toBe('');
      expect(result.current.antiDiagonalEndText).toBe('');
      expect(result.current.activeField).toBe('diagonal');
    });
  });

  describe('field switching', () => {
    it('allows manual switch to antiDiagonal before diagonal is complete', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.setActiveField('antiDiagonal');
      });

      expect(result.current.activeField).toBe('antiDiagonal');

      act(() => {
        result.current.handleFilePress('c');
      });

      expect(result.current.antiDiagonalStartText).toBe('c');
      expect(result.current.diagonalStartText).toBe('');
    });
  });

  describe('input validation (file vs rank expectations)', () => {
    it('ignores rank press when expecting file', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      expect(result.current.expectingFile).toBe(true);

      act(() => {
        result.current.handleRankPress('1');
      });

      expect(result.current.diagonalStartText).toBe('');
      expect(result.current.currentStep).toBe('file1');
    });

    it('ignores file press when expecting rank', () => {
      const { result } = renderHook(() => useDiagonalInput(defaultProps));

      act(() => {
        result.current.handleFilePress('a');
      });

      expect(result.current.expectingRank).toBe(true);

      act(() => {
        result.current.handleFilePress('b');
      });

      // Should still be at rank1 step with only 'a'
      expect(result.current.diagonalStartText).toBe('a');
      expect(result.current.currentStep).toBe('rank1');
    });
  });
});
