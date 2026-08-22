import type { Mock } from 'vitest';

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
 * Only the resolution shape is provided. The chain *around* it — which of
 * `select` / `from` / `orderBy` / `limit` a given SUT walks, and whether it
 * branches per table — differs by call site and stays in each test, where it
 * documents what that SUT actually does.
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
