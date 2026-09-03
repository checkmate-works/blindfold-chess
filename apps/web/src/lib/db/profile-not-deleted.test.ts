import { and, count, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { db, profiles, userFollows } from './index';
import { profileNotDeleted } from './profile-not-deleted';

/**
 * Asserts on the SQL drizzle generates, not on a mocked query builder. The
 * point of this predicate is which index Postgres gets to use, and that is
 * decided entirely by how it is spelled — a stubbed builder would assert
 * nothing about it. `toSQL()` opens no connection.
 */
function compile(query: { toSQL(): { sql: string } }): string {
  return query.toSQL().sql.replace(/\s+/g, ' ').toLowerCase();
}

/** Everything from `WHERE` on, so a query's filter can be compared across shapes. */
function whereClauseOf(query: { toSQL(): { sql: string } }): string {
  const sql = compile(query);
  const at = sql.indexOf(' where ');
  expect(at).toBeGreaterThan(-1);
  return sql.slice(at);
}

const VIEWER = '00000000-0000-0000-0000-000000000001';

/**
 * The count behind the follower/following pagers: no join, because it projects
 * nothing from `profiles`.
 */
function followingCountQuery() {
  return db
    .select({ value: count() })
    .from(userFollows)
    .where(and(eq(userFollows.followerId, VIEWER), profileNotDeleted(userFollows.followingId)));
}

/** The list the count pages, which joins only to project the profile columns. */
function followingListQuery() {
  return db
    .select({ id: profiles.id })
    .from(userFollows)
    .innerJoin(profiles, eq(userFollows.followingId, profiles.id))
    .where(and(eq(userFollows.followerId, VIEWER), profileNotDeleted(userFollows.followingId)));
}

describe('profileNotDeleted', () => {
  const sql = compile(followingCountQuery());

  it('tests the deleted side of profiles, which is the side the partial index covers', () => {
    expect(sql).toContain(
      `not exists (select 1 from "profiles" ` +
        `where "profiles"."id" = "user_follows"."following_id" ` +
        `and "profiles"."deleted_at" is not null)`
    );
  });

  it('never asks Postgres to match live profiles', () => {
    // `deleted_at IS NULL` matches nearly every row in `profiles`, so once the
    // planner's estimate on the other side is high enough it hash-joins and
    // sequentially scans the whole table. Rewriting this predicate into that
    // form is the regression this file exists to catch: it stays fast in
    // development and flips only on the busiest accounts.
    expect(sql).not.toContain('"profiles"."deleted_at" is null');
  });

  it('stays a WHERE-clause predicate rather than a join', () => {
    // A caller may still join `profiles` to project its columns. This helper
    // must never be the thing that introduces the join, because a filtering
    // join is what the plan above is trying to avoid.
    expect(sql).not.toContain('join');
  });

  it('excludes deleted profiles without also requiring the profile to exist', () => {
    // The premise of the equivalence argued on the helper's `@design` note: a
    // row whose profile is absent satisfies a negated existence test, where an
    // inner join would drop it. If this ever became a bare `exists (...)`, the
    // note's conclusion would still read as true while the two sides of every
    // list/count pair had silently swapped which one is narrower.
    expect(sql).toContain('not exists (select 1 from "profiles"');
    expect(sql).not.toMatch(/[^t] exists \(select 1 from "profiles"/);
  });
});

describe('a follower list and the count that pages it', () => {
  it('filter on one and the same predicate', () => {
    // The bug this pins: the count used the helper while the list spelled the
    // rule as `isNull(profiles.deletedAt)` on its join, so the two could return
    // different totals and the pager could offer a page the list had no rows to
    // fill. Comparing the compiled WHERE clauses catches a drift back to that
    // in either direction — including someone "simplifying" only one of them.
    expect(whereClauseOf(followingListQuery())).toBe(whereClauseOf(followingCountQuery()));
  });

  it('differ only in the join the list needs to project profile columns', () => {
    expect(compile(followingListQuery())).toContain(
      'inner join "profiles" on "user_follows"."following_id" = "profiles"."id"'
    );
    // The join carries no filter of its own. Adding one back here is the other
    // way the pair drifts apart, and it would not show up in the WHERE
    // comparison above.
    expect(compile(followingListQuery())).not.toContain(
      '"profiles"."id" and "profiles"."deleted_at"'
    );
    expect(compile(followingCountQuery())).not.toContain('join');
  });
});
