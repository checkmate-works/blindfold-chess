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
 * one each way. Both follower lists used to count with this and list with
 * `isNull(profiles.deletedAt)` on an inner join, and the problem-author
 * sitemap query used the join form alone. A count that drifts from its list is
 * a pagination bug that only appears on the last page, where the pager offers
 * a page the list has no rows to fill.
 *
 * @design Why the join a list still needs does not reintroduce that drift
 * This predicate and an inner join onto `profiles` do not ask the same
 * question. This one is satisfied by a row whose profile is *absent* — there
 * is no deleted profile with that id because there is no profile with that id
 * — where the join drops it. So a list that keeps the join to project the
 * profile's columns is strictly narrower than the count beside it, unless the
 * referencing table cannot hold a row whose profile is missing.
 *
 * For `user_follows` it cannot, at both ends of the row's life:
 *
 * - Nothing can insert one. `toggleFollow` is the only writer, and it resolves
 *   the follower through the guard that requires a `profiles` row and the
 *   target by selecting `profiles` by username. A provisional user — a
 *   confirmed `auth.users` row that has not completed setup — has no profile,
 *   therefore no username, and so cannot be named as a follow target.
 * - Nothing can strand one. A `profiles` row is only ever removed by
 *   `profiles_id_fkey ON DELETE CASCADE` when the retention-gated purge cron
 *   hard-deletes the `auth.users` row; that same delete fires
 *   `user_follows_follower_id_fkey` and `user_follows_following_id_fkey`,
 *   which are `ON DELETE CASCADE` too, so the follow rows go in the same
 *   statement. No other path deletes a profile: no application code does, the
 *   `authenticated` and `anon` roles are granted only SELECT and INSERT on the
 *   table, and there is no DELETE policy. (All three constraints are in
 *   `drizzle/supabase/foreign_keys_and_grants.sql` and `rls_policies.sql`.)
 *
 * Account deletion is a soft delete that leaves `auth.users` intact, so it
 * never reaches the cascade at all — it sets `deleted_at`, which is exactly
 * what this predicate is here to test.
 *
 * A future caller over some other table has to redo that argument for its own
 * table rather than inherit this one. Where it does not hold, put the
 * existence requirement on both sides — `liveProfileJoinOn` in
 * `./profile-select` is the join-side spelling — instead of mixing the two.
 */
/*
 * The parentheses are written out rather than delegated to drizzle's
 * `notExists()`: that helper does not wrap a raw `sql` fragment, so it emits
 * `not exists select 1 …` and Postgres rejects it with a syntax error.
 */
export function profileNotDeleted(userIdColumn: AnyPgColumn): SQL {
  return sql`not exists (select 1 from ${profiles} where ${profiles.id} = ${userIdColumn} and ${profiles.deletedAt} is not null)`;
}
