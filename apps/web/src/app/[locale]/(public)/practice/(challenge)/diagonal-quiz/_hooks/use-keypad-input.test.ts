import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKeypadInput } from './use-keypad-input';

type Options = Parameters<typeof useKeypadInput>[0];

function setup(overrides: Partial<Options> = {}) {
  const props: Options = {
    currentSquare: 'd4',
    showResult: false,
    isDisabled: false,
    onAnswer: vi.fn(),
    ...overrides,
  };
  return { props, ...renderHook(useKeypadInput, { initialProps: props }) };
}

describe('useKeypadInput question lifecycle', () => {
  it('clears both fields and the selected field when the square changes', () => {
    const { result, rerender, props } = setup();
    act(() => result.current.handleFilePress('a'));
    act(() => result.current.handleFieldClick('antiDiagonal'));
    act(() => result.current.handleFilePress('h'));
    expect(result.current.diagonalStartText).toBe('a');
    expect(result.current.antiDiagonalStartText).toBe('h');

    rerender({ ...props, currentSquare: 'e5' });
    expect(result.current.diagonalStartText).toBe('');
    expect(result.current.antiDiagonalStartText).toBe('');
    expect(result.current.activeField).toBe('diagonal');
  });

  it('keeps the answer visible during feedback, then resets even if the next square repeats', () => {
    const { result, rerender, props } = setup();
    act(() => result.current.handleFilePress('a'));
    rerender({ ...props, showResult: true, isDisabled: true });
    expect(result.current.diagonalStartText).toBe('a');

    rerender(props);
    expect(result.current.diagonalStartText).toBe('');
    expect(result.current.expectingFile).toBe(true);
  });

  it('preserves partial input across a pause and blocks edits until resumed', () => {
    const { result, rerender, props } = setup();
    act(() => result.current.handleFilePress('a'));
    rerender({ ...props, isDisabled: true });
    act(() => result.current.handleFieldClick('antiDiagonal'));
    act(() => result.current.handleRankPress('1'));
    expect(result.current.activeField).toBe('diagonal');
    expect(result.current.diagonalStartText).toBe('a');
    expect(props.onAnswer).not.toHaveBeenCalled();

    rerender(props);
    act(() => result.current.handleRankPress('1'));
    expect(result.current.diagonalStartText).toBe('a1');
  });

  it('submits the single-square anti-diagonal at a corner without an end coordinate', () => {
    const { result, props } = setup({ currentSquare: 'a1' });
    expect(result.current.singleAntiDiagonal).toBe(true);
    act(() => result.current.handleFilePress('a'));
    act(() => result.current.handleRankPress('1'));
    act(() => result.current.handleFilePress('h'));
    act(() => result.current.handleRankPress('8'));
    act(() => result.current.handleFilePress('a'));
    act(() => result.current.handleRankPress('1'));
    expect(props.onAnswer).toHaveBeenCalledExactlyOnceWith('a1-h8', 'a1');
  });
});
