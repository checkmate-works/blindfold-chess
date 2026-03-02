import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountdown } from './use-countdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with countdown at 3 and isCountingDown true', () => {
    const { result } = renderHook(() => useCountdown());
    expect(result.current.countdown).toBe(3);
    expect(result.current.isCountingDown).toBe(true);
  });

  it('counts down from 3 to null', () => {
    const { result } = renderHook(() => useCountdown());

    // 3 -> 2
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.countdown).toBe(2);
    expect(result.current.isCountingDown).toBe(true);

    // 2 -> 1
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.countdown).toBe(1);

    // 1 -> 0
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.countdown).toBe(0);

    // 0 -> null (START! display for 500ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.countdown).toBeNull();
    expect(result.current.isCountingDown).toBe(false);
  });
});
