import { describe, expect, it } from 'vitest';

import { db, userFollows } from './index';
import { profileNotDeleted } from './profile-not-deleted';

/**
 * Asserts on the SQL drizzle generates, not on a mocked query builder. The
 * point of this predicate is which index Postgres gets to use, and that is
 * decided entirely by how it is spelled — a stubbed builder would assert
 * nothing about it. `toSQL()` opens no connection.
 */
function compile() {
  const { sql } = db
    .select()
    .from(userFollows)
    .where(profileNotDeleted(userFollows.followingId))
    .toSQL();
  return sql.replace(/\s+/g, ' ').toLowerCase();
}

describe('profileNotDeleted', () => {
  const sql = compile();

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
});
