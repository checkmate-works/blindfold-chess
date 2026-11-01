import { afterEach, describe, expect, it, vi } from 'vitest';

import { postSlackMessage } from './slack';

/**
 * The webhook's deadline is real seconds, and `AbortSignal.timeout` runs on a
 * native timer that fake timers cannot advance, so the factory is swapped for
 * one that hands out a millisecond deadline instead. The recorded argument is
 * what the module actually asked for.
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

const WEBHOOK_URL = 'https://hooks.slack.com/services/T0/B0/SECRET-PATH';

describe('postSlackMessage — request deadline', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for a ten-second deadline', () => {
    expect(recordedDeadlinesMs).toEqual([10_000]);
  });

  it('rejects with a TimeoutError when Slack stalls, without naming the URL', async () => {
    // Slack accepting the connection and then saying nothing.
    vi.stubGlobal('fetch', (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener('abort', () => reject(signal.reason));
      });
    });

    await expect(postSlackMessage(WEBHOOK_URL, 'hello')).rejects.toMatchObject({
      name: 'TimeoutError',
      message: expect.not.stringContaining('SECRET-PATH'),
    });
  });
});
