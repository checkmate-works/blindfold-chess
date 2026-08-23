import { unstable_cache } from 'next/cache';

import { withTimeout } from '@/lib/db-timeout';

/** How long an entitlement answer may be served from the Data Cache. */
const ENTITLEMENT_REVALIDATE_SECONDS = 60;

/**
 * A cached, fail-closed "does this user hold X?" check.
 *
 * The three entitlement reads behind the ad-free decision — an active
 * subscription, an active grant, a dan-tier rank — are the same four decisions
 * wearing different queries, and each was spelled out in full:
 *
 * - the query runs under {@link withTimeout}, so a stalled connection is
 *   released rather than held for the full statement timeout;
 * - a failure is caught and answers `false`, so a database problem shows ads
 *   rather than handing out a perk nobody paid for;
 * - the answer is cached under a tag its writers expire, not by time alone;
 * - `revalidate` bounds how long a stale `true` can outlive a revocation.
 *
 * None of that is visible in a call site, and the pairing is held together by
 * convention: `withTimeout` has no other callers in the app. Writing the fourth
 * one by hand is where the timeout or the fail-closed `catch` gets dropped, and
 * a check that throws instead of answering `false` fails *open*.
 *
 * `query` returns rows; existence is `rows.length > 0`. Select a single narrow
 * column and `limit(1)` — nothing here reads the row.
 */
export function cachedExistenceCheck<Args extends unknown[]>(
  options: { keyParts: string[]; tag: string; warning: string },
  query: (...args: Args) => Promise<readonly unknown[]>
): (...args: Args) => Promise<boolean> {
  return unstable_cache(
    async (...args: Args): Promise<boolean> => {
      try {
        const rows = await withTimeout(query(...args));
        return rows.length > 0;
      } catch (error) {
        console.warn(options.warning, error);
        return false;
      }
    },
    options.keyParts,
    { tags: [options.tag], revalidate: ENTITLEMENT_REVALIDATE_SECONDS }
  );
}
