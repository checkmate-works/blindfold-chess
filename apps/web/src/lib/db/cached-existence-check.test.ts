import { describe, expect, it, vi } from 'vitest';

const recordedTags: string[][] = [];

// The global setup makes `unstable_cache` a pass-through so suites can reach
// their subject; this one is about what the wrapper is built with, so it
// records the options instead.
vi.mock('next/cache', () => ({
  unstable_cache: (
    fn: (...args: unknown[]) => unknown,
    _keys: string[],
    opts: { tags: string[] }
  ) => {
    recordedTags.push(opts.tags);
    return fn;
  },
}));

const { cachedExistenceCheck } = await import('./cached-existence-check');

describe('cachedExistenceCheck', () => {
  it("tags each call with the tag derived from that call's arguments", async () => {
    recordedTags.length = 0;
    const check = cachedExistenceCheck(
      { keyParts: ['k'], tag: (userId: string) => `thing:${userId}`, warning: 'w' },
      async () => [{ id: 1 }]
    );

    await check('alice');
    await check('bob');

    expect(recordedTags).toEqual([['thing:alice'], ['thing:bob']]);
  });

  it('answers true when the query returns rows and false when it returns none', async () => {
    const rows: unknown[] = [];
    const check = cachedExistenceCheck(
      { keyParts: ['k'], tag: () => 't', warning: 'w' },
      async () => rows
    );

    await expect(check()).resolves.toBe(false);
    rows.push({ id: 1 });
    await expect(check()).resolves.toBe(true);
  });

  it('fails closed: a query error answers false and is logged', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const check = cachedExistenceCheck(
      { keyParts: ['k'], tag: () => 't', warning: 'lookup failed:' },
      async () => {
        throw new Error('boom');
      }
    );

    await expect(check()).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith('lookup failed:', expect.any(Error));
  });
});
