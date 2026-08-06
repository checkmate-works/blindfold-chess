import { act } from 'react';

import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider, useToast } from './ToastContext';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderToastApi() {
  let api: ReturnType<typeof useToast> | null = null;
  function Probe() {
    api = useToast();
    return null;
  }
  render(
    <ToastProvider>
      <Probe />
    </ToastProvider>
  );
  // The probe assigns on every render, so this getter always reads the latest.
  return () => api!;
}

describe('ToastProvider', () => {
  // A single navigation can raise several toasts in one pass — `?coinsEarned=3`
  // plus `?coinsCapped=1` is a normal shape — so same-tick ids must stay
  // distinct. The clock is frozen because the old `Date.now()` id only
  // collided when both calls landed in the same millisecond, which real timing
  // makes intermittent.
  it('gives same-tick toasts distinct ids', () => {
    const api = renderToastApi();
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    act(() => {
      api().showToast('earned', 'success');
      api().showToast('capped', 'warning');
    });

    expect(api().toasts).toHaveLength(2);
    expect(api().toasts[0].id).not.toBe(api().toasts[1].id);
  });

  // Every removal path filters by id, so colliding ids made dismissing one
  // toast take the other's message down with it.
  it('hides only the dismissed toast', () => {
    const api = renderToastApi();
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    act(() => {
      api().showToast('earned', 'success');
      api().showToast('capped', 'warning');
    });
    act(() => api().hideToast(api().toasts[0].id));

    expect(api().toasts).toHaveLength(1);
    expect(api().toasts[0].message).toBe('capped');
  });

  it('auto-hides only the expired toast', () => {
    vi.useFakeTimers();
    try {
      const api = renderToastApi();

      act(() => api().showToast('first', 'info'));
      act(() => vi.advanceTimersByTime(1000));
      act(() => api().showToast('second', 'info'));
      // 3s after the first toast, 2s after the second.
      act(() => vi.advanceTimersByTime(2000));

      expect(api().toasts).toHaveLength(1);
      expect(api().toasts[0].message).toBe('second');
    } finally {
      vi.useRealTimers();
    }
  });
});
