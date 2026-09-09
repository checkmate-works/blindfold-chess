import { type Mock, vi } from 'vitest';

/**
 * Drizzle query-chain doubles for tests that mock `@/lib/db`.
 *
 * These express one idea that a couple of dozen action tests had each written
 * out: **a `where` that records its arguments on a spy and resolves to that
 * same spy's most recent queued return value.** Using the spy for both jobs is
 * what makes `mockSelectFromWhere.mockReturnValue(rows)` read as "the next
 * query finds these rows", and it is the part that was tedious enough to get
 * transcribed rather than shared.
 *
 * Two shapes are provided. The `whereThen*` doubles give only the resolution
 * end: the chain *around* it — which of `select` / `from` / `orderBy` / `limit`
 * a given SUT walks, and whether it branches per table — differs by call site
 * and stays in each test, where it documents what that SUT actually does.
 * {@link mockChain} is for the query tests that do not care about the walk
 * at all, only about which rows come out: one self-returning builder that
 * resolves to a fixed row set wherever it is awaited.
 */

/** The rows the spy was last told to return; `[]` before any are queued. */
export function lastQueuedRows(spy: Mock): unknown {
  return spy.mock.results[spy.mock.calls.length - 1]?.value ?? [];
}

/** A `where` whose result is awaited through `.limit()`. */
export function whereThenLimit(spy: Mock) {
  return (...args: unknown[]) => {
    spy(...args);
    return { limit: () => lastQueuedRows(spy) };
  };
}

/** A `where` whose rows are read back through `.returning()` (UPDATE ... RETURNING). */
export function whereThenReturning(spy: Mock) {
  return (...args: unknown[]) => {
    spy(...args);
    return { returning: () => lastQueuedRows(spy) };
  };
}

/** A `where` that is awaited directly, with no `.limit()` in the chain. */
export function whereThenRows(spy: Mock) {
  return (...args: unknown[]) => {
    spy(...args);
    return lastQueuedRows(spy);
  };
}

/**
 * Every builder method the query tests walk. A superset on purpose: a test
 * that hands the SUT a `mockChain` is asserting on the rows it gets back, not
 * on which of these the SUT called, so the double answers all of them.
 */
const CHAIN_METHODS = [
  'select',
  'selectDistinct',
  'from',
  'leftJoin',
  'innerJoin',
  'where',
  'orderBy',
  'groupBy',
  'limit',
  'offset',
  '$dynamic',
] as const;

/**
 * A Drizzle-style builder whose every method returns the builder itself, and
 * which resolves to `rows` when awaited. Each method is a spy, so a test can
 * still check `chain.limit` was called with the page size when that is the
 * point. Nine query suites had written this out, differing only in which
 * subset of {@link CHAIN_METHODS} they listed.
 */
export function mockChain(rows: unknown[]): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  for (const m of CHAIN_METHODS) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(rows);
  return chain;
}
