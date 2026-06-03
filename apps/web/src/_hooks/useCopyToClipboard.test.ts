import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCopyToClipboard } from './useCopyToClipboard';

describe('useCopyToClipboard', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes the text and flips copied true, then false after the delay', async () => {
    const { result } = renderHook(() => useCopyToClipboard(1000));
    expect(result.current.copied).toBe(false);

    await act(async () => {
      result.current.copy('hello');
    });

    expect(writeText).toHaveBeenCalledWith('hello');
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.copied).toBe(false);
  });

  it('keeps copied true until the full delay elapses', async () => {
    const { result } = renderHook(() => useCopyToClipboard(1000));

    await act(async () => {
      result.current.copy('x');
    });
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current.copied).toBe(true);
  });
});
