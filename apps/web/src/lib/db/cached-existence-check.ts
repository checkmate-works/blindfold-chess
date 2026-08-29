import { unstable_cache } from 'next/cache';

/** How long an entitlement answer may be served from the Data Cache. */
const ENTITLEMENT_REVALIDATE_SECONDS = 60;

/**
 * A cached, fail-closed "does this user hold X?" check.
 *
 * The three entitlement reads behind the ad-free decision — an active
 * subscription, an active grant, a dan-tier rank — are the same three
 * decisions wearing different queries, and each was spelled out in full:
 *
 * - a failure is caught and answers `false`, so a database problem shows ads
 *   rather than handing out a perk nobody paid for;
 * - the answer is cached under a tag its writers expire, not by time alone;
 * - `revalidate` bounds how long a stale `true` can outlive a revocation.
 *
 * None of that is visible in a call site. Writing the fourth one by hand is
 * where the fail-closed `catch` gets dropped, and a check that throws instead
 * of answering `false` fails *open*.
 *
 * Bounding the query is deliberately NOT this helper's job. The `db` client is
 * already wrapped by `withQueryDeadline` (see `@/lib/db`), which abandons a
 * query at the shared deadline and — the part that matters — reclaims the
 * connection behind it: it tracks the query as in-flight, retries a deadlined
 * SELECT on a fresh pool, and rebuilds the pool when the abandoned query never
 * settles. A shorter racing timer around the promise here would win that race
 * every time, rejecting the awaiter while the underlying query kept running
 * and kept holding its pool slot, invisible to all of that. An entitlement
 * check that genuinely needs a tighter budget should get one from
 * `withQueryDeadline`, not from a second timer.
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
        const rows = await query(...args);
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
