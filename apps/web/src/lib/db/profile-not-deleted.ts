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
 * measured 8,134 shared buffers, versus 84 for the form below, and running one
 * per prefetched profile link was enough to stall renders in production. See
 * the navigation-stall entry in CLAUDE.md's Known Issues.
 *
 * Testing the rare side instead — "no deleted profile with this id" — probes
 * the partial `idx_profiles_deleted` index, which covers a few percent of the
 * table and stays cached. Same result, and the cost no longer depends on how
 * big `profiles` has grown.
 *
 * Use this wherever the number of rows being filtered can grow. A single-row
 * lookup that already has the profile in hand does not need it.
 */
/*
 * The parentheses are written out rather than delegated to drizzle's
 * `notExists()`: that helper does not wrap a raw `sql` fragment, so it emits
 * `not exists select 1 …` and Postgres rejects it with a syntax error.
 */
export function profileNotDeleted(userIdColumn: AnyPgColumn): SQL {
  return sql`not exists (select 1 from ${profiles} where ${profiles.id} = ${userIdColumn} and ${profiles.deletedAt} is not null)`;
}
