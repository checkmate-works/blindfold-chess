import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isRetryableLlmError } from './llm-client';

/**
 * The adapter's deadline is real seconds, so the factory is swapped for one
 * that hands out a millisecond deadline instead. The recorded argument is
 * what the adapter actually asked for, which is the half worth asserting.
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

/** The `maxDuration` of the route whose `after()` runs the generation job. */
const JOB_ROUTE_MAX_DURATION_MS = 60_000;

const request = {
  system: 'system',
  user: 'user',
  schemaName: 'ai_game_review',
  schema: {},
  maxOutputTokens: 8000,
};

/** The module binds its deadline at import time, so each test needs a fresh one. */
async function importFresh() {
  vi.resetModules();
  recordedDeadlinesMs.length = 0;
  return import('./openai');
}

/** A provider that accepts the connection and then says nothing. */
function stubStallingFetch() {
  vi.stubGlobal('fetch', (_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) return;
      if (signal.aborted) reject(signal.reason);
      else signal.addEventListener('abort', () => reject(signal.reason));
    });
  });
}

describe('createOpenAiClient — request deadline', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('asks for a deadline that leaves the job route room to finish', async () => {
    await importFresh();

    expect(recordedDeadlinesMs).toEqual([45_000]);
    expect(recordedDeadlinesMs[0]).toBeLessThan(JOB_ROUTE_MAX_DURATION_MS);
  });

  it('turns a stalled provider into a retryable transport error', async () => {
    stubStallingFetch();
    const { createOpenAiClient } = await importFresh();

    const result = await createOpenAiClient('gpt-5-mini').complete(request);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('transport');
    expect(isRetryableLlmError(result.error)).toBe(true);
  });

  it('leaves a response that arrives before the deadline untouched', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
    }));
    const { createOpenAiClient } = await importFresh();

    const result = await createOpenAiClient('gpt-5-mini').complete(request);

    expect(result).toEqual({ ok: true, value: '{"ok":true}' });
  });
});
