import { describe, expect, it } from 'vitest';

import { db, feedItems } from '@/lib/db';

import { liveFeedRow } from './feed-liveness';

/**
 * Asserts on the SQL drizzle generates rather than on a mocked query builder.
 * The whole value of this predicate is that Postgres — not JavaScript — drops
 * dead rows before they consume a page slot, and *how* it is spelled decides
 * whether that costs a primary-key lookup or a sequential scan of three
 * tables (see the `@design` note on `liveFeedRow`). A test that stubbed the
 * builder would assert nothing about either. `toSQL()` opens no connection.
 */
function compile() {
  const { sql, params } = db.select().from(feedItems).where(liveFeedRow()).toSQL();
  const bound = sql.replace(/\$(\d+)/g, (_, i) => {
    const v = params[Number(i) - 1];
    return typeof v === 'string' ? `'${v}'` : String(v);
  });
  return bound.replace(/\s+/g, ' ');
}

describe('liveFeedRow', () => {
  const sql = compile();

  it('admits a topic post only while it is not soft-deleted', () => {
    expect(sql).toContain(
      `WHEN 'topic_post' THEN ( SELECT "topic_posts"."deleted_at" IS NULL ` +
        `FROM "topic_posts" WHERE "topic_posts"."id" = "feed_items"."entity_id" )`
    );
  });

  it('admits a position only while it is not soft-deleted', () => {
    expect(sql).toContain(
      `WHEN 'position' THEN ( SELECT "positions"."deleted_at" IS NULL ` +
        `FROM "positions" WHERE "positions"."id" = "feed_items"."entity_id" )`
    );
  });

  it('admits a chunk only while it is not soft-deleted', () => {
    expect(sql).toContain(
      `WHEN 'chunk' THEN ( SELECT "chunks"."deleted_at" IS NULL ` +
        `FROM "chunks" WHERE "chunks"."id" = "feed_items"."entity_id" )`
    );
  });

  it('admits a game only while it is live AND public', () => {
    // A game the author switches back to private has to drop out of every feed
    // it was posted to — and reappear, in place, if they publish it again.
    // Spelled by `publiclyVisible()` rather than inline, so the parentheses
    // and lower-case operators are drizzle's rendering of that predicate.
    expect(sql).toContain(
      `WHEN 'game' THEN ( SELECT ("games"."deleted_at" is null and "games"."status" = 'public') ` +
        `FROM "games" WHERE "games"."id" = "feed_items"."entity_id" )`
    );
  });

  it('admits a rank update only for a live actor within the display threshold', () => {
    expect(sql).toContain(
      `WHEN 'challenge_rank_update' THEN ( SELECT true FROM "profiles" ` +
        `WHERE "profiles"."id" = "feed_items"."actor_id" )`
    );
    // Compared as jsonb, not cast to int: a malformed legacy payload must sort
    // as not-a-number and drop out rather than error the whole query.
    expect(sql).toContain(`"feed_items"."metadata" -> 'rank' <= to_jsonb(10::int)`);
  });

  it('rejects an entity type it has not been taught', () => {
    // Fail-closed. A new type is invisible until it is added here, alongside
    // its loader and its branch of the orchestrator switch in `queries.ts`.
    expect(sql).toContain('ELSE false');
  });

  it('covers every entity type the feed can render', () => {
    for (const type of ['topic_post', 'position', 'chunk', 'game', 'challenge_rank_update']) {
      expect(sql).toContain(`WHEN '${type}' THEN`);
    }
  });

  it('uses scalar subqueries, never EXISTS', () => {
    // Not a style rule. `EXISTS` under the `OR` this predicate would otherwise
    // need makes Postgres build hashed SubPlans — a sequential scan of
    // `topic_posts`, `positions` and `chunks` per feed query, measured at 84ms
    // against 0.8ms for this spelling. `CASE` alone does not prevent it; only
    // dropping `EXISTS` does.
    expect(sql).not.toContain('EXISTS');
    // One scalar subquery per branch. (Drizzle emits the outer `select`
    // lowercase, so only this predicate's own subqueries are counted.)
    expect(sql.match(/SELECT/g)?.length).toBe(5);
  });
});
