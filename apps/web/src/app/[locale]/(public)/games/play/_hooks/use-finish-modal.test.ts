import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FINISH_MODAL_AUTO_OPEN_DELAY_MS, useFinishModal } from './use-finish-modal';

type Params = Parameters<typeof useFinishModal>[0];

const live: Params = { isFinished: true, isFinishedView: false, isInitializing: false };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('useFinishModal', () => {
  it('leaves the finished board uncovered for the delay, then opens', () => {
    const { result } = renderHook(() => useFinishModal(live));

    expect(result.current.finishModalOpen).toBe(false);
    advance(FINISH_MODAL_AUTO_OPEN_DELAY_MS - 1);
    expect(result.current.finishModalOpen).toBe(false);

    advance(1);
    expect(result.current.finishModalOpen).toBe(true);
  });

  it('never auto-opens while reviewing a finished game', () => {
    const { result } = renderHook(() => useFinishModal({ ...live, isFinishedView: true }));

    advance(FINISH_MODAL_AUTO_OPEN_DELAY_MS * 2);
    expect(result.current.finishModalOpen).toBe(false);
  });

  it('never auto-opens for a game still in progress', () => {
    const { result } = renderHook(() => useFinishModal({ ...live, isFinished: false }));

    advance(FINISH_MODAL_AUTO_OPEN_DELAY_MS * 2);
    expect(result.current.finishModalOpen).toBe(false);
  });

  it('waits for initialization to settle before starting the beat', () => {
    const { result, rerender } = renderHook((props: Params) => useFinishModal(props), {
      initialProps: { ...live, isInitializing: true },
    });

    advance(FINISH_MODAL_AUTO_OPEN_DELAY_MS);
    expect(result.current.finishModalOpen).toBe(false);

    rerender(live);
    advance(FINISH_MODAL_AUTO_OPEN_DELAY_MS);
    expect(result.current.finishModalOpen).toBe(true);
  });

  it('auto-opens once — a dismissal is not undone by a later render', () => {
    const { result, rerender } = renderHook((props: Params) => useFinishModal(props), {
      initialProps: live,
    });

    advance(FINISH_MODAL_AUTO_OPEN_DELAY_MS);
    act(() => result.current.setFinishModalOpen(false));

    rerender({ ...live });
    advance(FINISH_MODAL_AUTO_OPEN_DELAY_MS * 2);
    expect(result.current.finishModalOpen).toBe(false);
  });

  it('does not throw a dismissed modal back at the player mid-delay', () => {
    const { result } = renderHook(() => useFinishModal(live));

    // Opened from the finished overlay's "Next action" button and dismissed
    // again, all before the scheduled auto-open would have fired.
    act(() => result.current.setFinishModalOpen(true));
    act(() => result.current.setFinishModalOpen(false));

    advance(FINISH_MODAL_AUTO_OPEN_DELAY_MS * 2);
    expect(result.current.finishModalOpen).toBe(false);
  });

  it('cancels the pending open when the screen goes away', () => {
    const { result, unmount } = renderHook(() => useFinishModal(live));

    unmount();
    advance(FINISH_MODAL_AUTO_OPEN_DELAY_MS);
    expect(result.current.finishModalOpen).toBe(false);
  });
});
