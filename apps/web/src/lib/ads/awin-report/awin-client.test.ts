import { afterEach, describe, expect, it, vi } from 'vitest';

import { type AwinClientConfig, fetchAdvertiserReport } from './awin-client';

/**
 * The client's deadline is real seconds, and `AbortSignal.timeout` runs on a
 * native timer that fake timers cannot advance, so the factory is swapped for
 * one that hands out a millisecond deadline instead. The recorded argument is
 * what the client actually asked for.
 */
const { recordedDeadlinesMs, TEST_DEADLINE_MS } = vi.hoisted(() => ({
  recordedDeadlinesMs: [] as number[],
  TEST_DEADLINE_MS: 50,
}));

vi.mock('@/lib/http/fetch-with-timeout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http/fetch-with-timeout')>();
  return {
    createFetchWithTimeout: (timeoutMs: number) => {
      recordedDeadlinesMs.push(timeoutMs);
      return actual.createFetchWithTimeout(TEST_DEADLINE_MS);
    },
  };
});

const config: AwinClientConfig = {
  token: 'tok-SECRET-123',
  publisherId: '2801536',
  region: 'US',
  timezone: 'UTC',
};

const range = { startDate: '2026-10-01', endDate: '2026-10-01' };

/** A fetch that only settles when its signal aborts: Awin accepting and then saying nothing. */
function stallingResponse(init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) return;
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener('abort', () => reject(signal.reason));
  });
}

describe('Awin client — request deadline', () => {
  const fetchMock = vi.fn<typeof fetch>();

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('asks for a one-minute deadline', () => {
    expect(recordedDeadlinesMs).toEqual([60_000]);
  });

  it('rejects with a TimeoutError when Awin stalls', async () => {
    fetchMock.mockImplementation((_input, init) => stallingResponse(init));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAdvertiserReport(config, range)).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives the attempt after a 429 its own deadline', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'retry-after': '0' } }))
      .mockImplementationOnce((_input, init) => stallingResponse(init));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAdvertiserReport(config, range)).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstSignal, secondSignal] = fetchMock.mock.calls.map(([, init]) => init?.signal);
    expect(secondSignal).not.toBe(firstSignal);
  });
});
