import { type SQL, sql } from 'drizzle-orm';

import { chunks, feedItems, games, positions, profiles, topicPosts } from '@/lib/db';

/**
 * Highest all-time leaderboard rank a `challenge_rank_update` row is worth
 * showing. Mirrors the threshold `decideChallengeRankFeedItem` applies when
 * writing the row (`@/lib/db/challenge-rank-feed`); it is repeated here
 * because the two run at different times. Lowering the write-side threshold
 * would otherwise leave every already-written row above the new value stranded
 * in the table as an unrenderable hole.
 */
const FEED_RANK_THRESHOLD = 10;

/**
 * `feed_items` rows whose subject can actually be rendered.
 *
 * @design Why liveness belongs in the WHERE clause
 * A feed row outlives the thing it points at. Nothing deletes it when a post,
 * position or chunk is soft-deleted, or when a game goes back to private —
 * only the rank-update reaper removes rows at all — so dead rows accumulate
 * permanently and cluster (a member deletes several things at once).
 *
 * Filtering them after the fact, which is what the per-entity loaders used to
 * be left to do, is wrong in a way that compounds: a dead row still consumes
 * one of the `LIMIT n + 1` slots, so a page can come back with a live cursor
 * and nothing on it. The profile timeline then had to re-query up to six times
 * per request to find anything to show, and could still hand the client an
 * empty page — which its infinite scroll answered by asking again, forever.
 * Deciding it here makes a page of `n` mean `n` renderable items, so the
 * cursor arithmetic and the "is this feed exhausted" question are both
 * answerable from one query.
 *
 * @design Evaluated per read, not materialised
 * Liveness is a predicate over the current state of the entity, not a fact
 * about the feed row, so nothing is written back. A game the author flips from
 * private to public reappears in the timeline it was posted to, in its
 * original position — which deleting the feed row (the other obvious fix)
 * would make impossible.
 *
 * @design Why a CASE of scalar subqueries, and not EXISTS
 * The obvious spelling — `entity_type = 'x' AND EXISTS (SELECT 1 FROM x ...)`,
 * OR'd across the five types — is a trap. Postgres cannot turn an `EXISTS`
 * under an `OR` into a semi-join, so it hoists each one into a *hashed*
 * SubPlan: it sequentially scans all of `topic_posts`, `positions` and
 * `chunks` to build hash tables, on every single feed query. Measured on a
 * 200k-row feed: 84ms, against 1.5ms for the same query with no filter at all.
 * Neither `LIMIT 1` inside the subquery nor wrapping the branches in `CASE`
 * prevents it.
 *
 * A scalar subquery per branch cannot be hashed — it is evaluated per row, as
 * a primary-key index scan against the one entity the row names. That is the
 * cheapest possible check and it keeps the whole predicate inside the existing
 * `WHERE`, where a `LEFT JOIN` formulation (the other plan that avoids the
 * seq scans) would have reshaped every caller's result. Measured at 0.8ms.
 *
 * A missing row makes the subquery `NULL`, which is not `true`, so a
 * hard-deleted entity drops out along with the soft-deleted ones. `ELSE false`
 * means an entity type nobody has taught this function about is invisible
 * rather than broken — fail-closed, and the same list the loaders and the
 * orchestrator switch in `queries.ts` have to agree on.
 */
export function liveFeedRow(): SQL {
  return sql`
    CASE ${feedItems.entityType}
      WHEN 'topic_post' THEN (
        SELECT ${topicPosts.deletedAt} IS NULL
        FROM ${topicPosts} WHERE ${topicPosts.id} = ${feedItems.entityId}
      )
      WHEN 'position' THEN (
        SELECT ${positions.deletedAt} IS NULL
        FROM ${positions} WHERE ${positions.id} = ${feedItems.entityId}
      )
      WHEN 'chunk' THEN (
        SELECT ${chunks.deletedAt} IS NULL
        FROM ${chunks} WHERE ${chunks.id} = ${feedItems.entityId}
      )
      WHEN 'game' THEN (
        SELECT ${games.deletedAt} IS NULL AND ${games.status} = 'public'
        FROM ${games} WHERE ${games.id} = ${feedItems.entityId}
      )
      WHEN 'challenge_rank_update' THEN (
        SELECT true FROM ${profiles} WHERE ${profiles.id} = ${feedItems.actorId}
      )
      AND ${feedItems.metadata} -> 'rank' <= to_jsonb(${FEED_RANK_THRESHOLD}::int)
      ELSE false
    END`;
}
