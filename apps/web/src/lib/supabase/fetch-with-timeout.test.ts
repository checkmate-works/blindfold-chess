import { afterEach, describe, expect, it, vi } from 'vitest';

import { createFetchWithTimeout } from './fetch-with-timeout';

/**
 * Stub `fetch` with one that only settles when its signal aborts, so the
 * wrapper's deadline is the only thing that can end the call.
 */
function stubNeverResolvingFetch() {
  vi.stubGlobal('fetch', (_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) return;
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      signal.addEventListener('abort', () => reject(signal.reason));
    });
  });
}

// `AbortSignal.timeout` runs on a native timer that `vi.useFakeTimers()`
// cannot advance, so these tests use real time with a short deadline.
const DEADLINE_MS = 50;

describe('createFetchWithTimeout', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects once the deadline passes', async () => {
    stubNeverResolvingFetch();
    const fetchWithTimeout = createFetchWithTimeout(DEADLINE_MS);

    await expect(fetchWithTimeout('https://example.test')).rejects.toMatchObject({
      name: 'TimeoutError',
    });
  });

  it('still honours an abort signal supplied by the caller', async () => {
    stubNeverResolvingFetch();
    // Long enough that only the caller's signal can end this call.
    const fetchWithTimeout = createFetchWithTimeout(60_000);
    const controller = new AbortController();

    const pending = fetchWithTimeout('https://example.test', { signal: controller.signal });
    controller.abort(new DOMException('caller aborted', 'AbortError'));

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('passes through a response that arrives before the deadline', async () => {
    const response = new Response('ok');
    vi.stubGlobal('fetch', () => Promise.resolve(response));
    const fetchWithTimeout = createFetchWithTimeout(DEADLINE_MS);

    await expect(fetchWithTimeout('https://example.test')).resolves.toBe(response);
  });
});
