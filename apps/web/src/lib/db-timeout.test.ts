import { afterEach, describe, expect, it, vi } from 'vitest';

import { withTimeout } from './db-timeout';

afterEach(() => {
  vi.useRealTimers();
});

describe('withTimeout', () => {
  it('should resolve with the promise value when it completes before timeout', async () => {
    const result = await withTimeout(Promise.resolve('success'), 1000);
    expect(result).toBe('success');
  });

  it('should reject with timeout error when promise exceeds timeout', async () => {
    vi.useFakeTimers();

    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('late'), 10000));
    const resultPromise = withTimeout(slow, 100).catch((e: Error) => e);

    await vi.advanceTimersByTimeAsync(100);

    const error = await resultPromise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('DB query timeout');
  });

  it('should reject with original error when promise rejects before timeout', async () => {
    const failing = Promise.reject(new Error('DB error'));

    await expect(withTimeout(failing, 1000)).rejects.toThrow('DB error');
  });

  it('should use default timeout when ms is not provided', async () => {
    const result = await withTimeout(Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('should clear the timer after promise resolves (no leaked timers)', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    await withTimeout(Promise.resolve('done'), 5000);

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('should clear the timer after promise rejects (no leaked timers)', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    await withTimeout(Promise.reject(new Error('fail')), 5000).catch(() => {});

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('should clear the timer after timeout fires (no leaked timers)', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const slow = new Promise<string>(() => {});
    const resultPromise = withTimeout(slow, 100).catch(() => {});

    await vi.advanceTimersByTimeAsync(100);
    await resultPromise;

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
