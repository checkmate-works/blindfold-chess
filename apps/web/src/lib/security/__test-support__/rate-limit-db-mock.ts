import type { Mock } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

/** The spies a rate-limit test wires into the `@/lib/db` double. */
export type RateLimitDbSpies = {
  /** Rows for the window count: `select(...).from(...).where(...)`. */
  selectFromWhere: Mock;
  /** Records the row handed to `insert(...).values(...)`. */
  insertValues: Mock;
};

/**
 * The `@/lib/db` stand-in both rate-limit modules are tested against: one
 * select chain for the count inside the window, one insert for the attempt
 * being recorded, over the real schema objects.
 *
 * `rate-limit.ts` and `rate-limit-ip.ts` walk the same two chains, and their
 * suites had each transcribed this double. The spies arrive behind a thunk
 * because `vi.mock` factories run while the test module's own top-level
 * `const mockX = vi.fn()` bindings are still in their temporal dead zone.
 */
export async function rateLimitDbMock(spies: () => RateLimitDbSpies) {
  return {
    ...(await actualDbSchema()),
    db: {
      select: () => ({
        from: () => ({
          where: () => spies().selectFromWhere(),
        }),
      }),
      insert: () => ({
        values: (...args: unknown[]) => spies().insertValues(...args),
      }),
    },
  };
}
