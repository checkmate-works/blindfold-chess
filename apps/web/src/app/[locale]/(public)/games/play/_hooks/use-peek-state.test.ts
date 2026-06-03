import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePeekState } from './use-peek-state';

describe('usePeekState', () => {
  it("'always' mode is never masked and reveal does not count a peek", () => {
    const recordPeek = vi.fn();
    const { result } = renderHook(() => usePeekState({ boardVisibility: 'always', recordPeek }));
    expect(result.current.boardMasked).toBe(false);
  });

  it("'never' mode stays masked even after a reveal", () => {
    const recordPeek = vi.fn();
    const { result } = renderHook(() => usePeekState({ boardVisibility: 'never', recordPeek }));
    expect(result.current.boardMasked).toBe(true);
    act(() => result.current.handleRevealBoard());
    expect(recordPeek).toHaveBeenCalledTimes(1);
    expect(result.current.boardMasked).toBe(true);
  });

  it("'peek' mode reveals on tap and re-masks on remask", () => {
    const recordPeek = vi.fn();
    const { result } = renderHook(() => usePeekState({ boardVisibility: 'peek', recordPeek }));
    expect(result.current.boardMasked).toBe(true);

    act(() => result.current.handleRevealBoard());
    expect(recordPeek).toHaveBeenCalledTimes(1);
    expect(result.current.boardMasked).toBe(false);

    act(() => result.current.remask());
    expect(result.current.boardMasked).toBe(true);
  });
});
