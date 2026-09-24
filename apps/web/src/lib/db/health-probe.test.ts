import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ProbeQuery, probeDatabase } from './health-probe';

/** Stand-in for a pending postgres.js query: a promise with `cancel()`. */
function fakeQuery(executor: ConstructorParameters<typeof Promise<unknown>>[0]): ProbeQuery & {
  cancel: ReturnType<typeof vi.fn>;
} {
  return Object.assign(new Promise<unknown>(executor), { cancel: vi.fn() });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('probeDatabase', () => {
  it('reports ok when the query answers within the timeout', async () => {
    const query = fakeQuery((resolve) => resolve([{ '?column?': 1 }]));

    await expect(probeDatabase(() => query, 1_000)).resolves.toBe('ok');
    expect(query.cancel).not.toHaveBeenCalled();
  });

  it('reports unavailable when the query rejects', async () => {
    const query = fakeQuery((_, reject) => reject(new Error('EMAXCONNSESSION')));

    await expect(probeDatabase(() => query, 1_000)).resolves.toBe('unavailable');
  });

  it('reports unavailable when building the query throws', async () => {
    const outcome = await probeDatabase(() => {
      throw new Error('driver refused');
    }, 1_000);

    expect(outcome).toBe('unavailable');
  });

  it('reports unavailable and cancels the query once the timeout passes', async () => {
    const query = fakeQuery(() => {});

    const outcome = probeDatabase(() => query, 1_000);
    await vi.advanceTimersByTimeAsync(999);
    expect(query.cancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    await expect(outcome).resolves.toBe('unavailable');
    expect(query.cancel).toHaveBeenCalledTimes(1);
  });

  it('still reports unavailable when cancelling a timed-out query throws', async () => {
    const query = fakeQuery(() => {});
    query.cancel.mockImplementation(() => {
      throw new Error('connection already destroyed');
    });

    const outcome = probeDatabase(() => query, 1_000);
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(outcome).resolves.toBe('unavailable');
  });

  it('leaves no timer pending after an answer', async () => {
    const query = fakeQuery((resolve) => resolve([]));

    await probeDatabase(() => query, 1_000);

    expect(vi.getTimerCount()).toBe(0);
  });
});
