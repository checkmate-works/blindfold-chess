import { type SQL, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { profiles } from './schema';

/**
 * Condition: the profile `userIdColumn` points at has not been soft-deleted.
 *
 * @design Why not `innerJoin(profiles, …).where(isNull(profiles.deletedAt))`
 * That reads better and is how this started, but it asks Postgres to match the
 * overwhelming majority of `profiles` — so once the planner estimates enough
 * rows on the other side it switches to a hash join and sequentially scans the
 * whole table. A follower count, logically proportional to the follower count,
 * then costs one full scan of `profiles` regardless. At 300k profiles that
 * measured 8,134 shared buffers, versus 84 for the form below — issued once
 * per profile-shell render (so once more on every `/u/[username]` tab switch),
 * concurrently with the shell's ten sibling queries, which under production
 * traffic was enough to stall renders. (An earlier version of this note blamed
 * link prefetching for firing dozens at once; that was wrong — `/u/[username]`
 * has a `loading.tsx`, so a default prefetch stops at that boundary and never
 * runs the page or this query. Corrected 2026-08-09; the fix commit's message
 * still carries the wrong claim.) The trap is that it stays fast in
 * development and on small accounts: the plan flips only once the row estimate
 * grows, i.e. for the busiest users.
 *
 * Testing the rare side instead — "no deleted profile with this id" — probes
 * the partial `idx_profiles_deleted` index, which covers a few percent of the
 * table and stays cached. Same result, and the cost no longer depends on how
 * big `profiles` has grown.
 *
 * Use this wherever the number of rows being filtered can grow. A single-row
 * lookup that already has the profile in hand does not need it.
 *
 * A list and the count that pages it must both be filtered with this, and not
 * one each way. The two spellings are not interchangeable at the row level —
 * `isNull(profiles.deletedAt)` on an inner join also drops a row whose profile
 * is gone entirely, where this returns true for it — so mixing them lets the
 * count outrun the list and the pager offer a page with nothing on it. Both
 * follower lists and the problem-author sitemap query used to be split that
 * way.
 */
/*
 * The parentheses are written out rather than delegated to drizzle's
 * `notExists()`: that helper does not wrap a raw `sql` fragment, so it emits
 * `not exists select 1 …` and Postgres rejects it with a syntax error.
 */
export function profileNotDeleted(userIdColumn: AnyPgColumn): SQL {
  return sql`not exists (select 1 from ${profiles} where ${profiles.id} = ${userIdColumn} and ${profiles.deletedAt} is not null)`;
}
