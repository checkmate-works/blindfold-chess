import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  max,
} from 'drizzle-orm';

import { db, gameComments, profiles, topicPosts } from './index';
import { AUTHOR_PROFILE_COLUMNS, liveProfileJoinOn } from './profile-select';

/** One commenter's avatar-stack entry, as rendered beside a reply count. */
export type Replier = {
  avatarUrl: string | null;
  displayName: string;
};

export type ReplyMeta = {
  replyCount: number;
  latestReplyAt: Date | null;
  repliers: Replier[];
  uniqueReplierCount: number;
};

/**
 * The "no comments" reply-meta value. Use as the fallback when a
 * `getReplyMetaMap` lookup returns `undefined` for a key (e.g. a topic
 * that has never received a comment, or a position type with no thread
 * such as `sequence`). Re-exporting a single shared instance keeps
 * call-site shape consistent and avoids dotting fresh literals around
 * the codebase.
 */
export const EMPTY_REPLY_META: ReplyMeta = {
  replyCount: 0,
  latestReplyAt: null,
  repliers: [],
  uniqueReplierCount: 0,
};

const MAX_REPLIERS_DISPLAY = 3;

/** The per-group aggregate half of a reply-meta lookup, keyed by the caller. */
type ReplyMetaStatsRow = {
  replyCount: number;
  latestReplyAt: Date | null;
  uniqueReplierCount: number;
};

/** The deduped per-(group, author) half, already joined to the author profile. */
type ReplyMetaReplierRow = {
  createdAt: Date;
  avatarUrl: string | null;
  displayName: string | null;
  username: string | null;
};

/**
 * Fold the two halves of a reply-meta lookup into the `ReplyMeta` per key that
 * callers render.
 *
 * Shared by the two lookups below, which run the same pair of queries against
 * different tables — `topic_posts` keyed by `(topicType, topicKey)` and
 * `game_comments` keyed by `game_id`. Only the queries differ; everything from
 * the returned rows onward is identical, and this is the half that a tidy-up
 * would have quietly diverged. Keeping it in one place is what makes the topic
 * feed and the game feed render the same avatar stack.
 *
 * Keys are read through accessors rather than by requiring both callers to
 * alias their key column to a common name, so the SQL each lookup emits — and
 * the row shape its own consumers assert on — is untouched.
 */
function assembleReplyMeta<S extends ReplyMetaStatsRow, R extends ReplyMetaReplierRow>(
  keys: string[],
  stats: S[],
  statsKey: (row: S) => string,
  dedupedRepliers: R[],
  replierKey: (row: R) => string
): Map<string, ReplyMeta> {
  const statsMap = new Map(stats.map((s) => [statsKey(s), s]));

  // `Map.groupBy` rather than a hand-rolled get/push/set — the latter is
  // exactly the kind of loop that invites a local "improvement".
  const repliersByKey = Map.groupBy(dedupedRepliers, replierKey);

  const map = new Map<string, ReplyMeta>();
  for (const key of keys) {
    const s = statsMap.get(key);
    // Sort within the group and keep the most recent N for display.
    const repliers = (repliersByKey.get(key) ?? [])
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, MAX_REPLIERS_DISPLAY)
      .map<Replier>((r) => ({
        avatarUrl: r.avatarUrl,
        displayName: r.displayName || r.username || 'Anonymous',
      }));
    map.set(key, {
      replyCount: s?.replyCount ?? 0,
      latestReplyAt: s?.latestReplyAt ?? null,
      repliers,
      uniqueReplierCount: s?.uniqueReplierCount ?? 0,
    });
  }

  return map;
}

/**
 * Polymorphic reply-meta lookup — for a list of topics identified by
 * `(topicType, topicKey)`, return the total comment count, the latest
 * comment timestamp, and up to 3 unique commenter avatars per topic.
 *
 * "Topic" here is the same `(topicType, topicKey)` shape that the
 * `topicPosts` table uses to attach a discussion thread to any
 * polymorphic owner — opening, square, position-memory, puzzle, etc.
 *
 * The aggregate counts include both root-level comments and their
 * replies, so a list-page badge of "X comments" reflects total
 * discussion volume on the topic. (Compare {@link attachPostMeta},
 * which aggregates replies under a single root post — different shape,
 * different keying.)
 *
 * @perf
 * Two parallel queries:
 *   1. Per-topic GROUP BY for `replyCount`, `latestReplyAt`, and
 *      `uniqueReplierCount` (via `count(distinct user_id)`).
 *   2. `SELECT DISTINCT ON (topic_key, user_id)` joined with profiles,
 *      returning only the latest comment per (topic, user) pair. Without
 *      DISTINCT ON the query would transfer every comment row for matching
 *      topics — for a popular topic with 100 comments × 12 topics on a
 *      feed page that would be ~1200 rows just to keep 36. With DISTINCT
 *      ON, transfer is bounded by `unique repliers × topics`.
 */
export async function getReplyMetaMap(
  topicType: string,
  topicKeys: string[]
): Promise<Map<string, ReplyMeta>> {
  if (topicKeys.length === 0) return new Map();

  const filter = and(
    eq(topicPosts.topicType, topicType),
    inArray(topicPosts.topicKey, topicKeys),
    isNull(topicPosts.deletedAt)
  );

  const [stats, dedupedRepliers] = await Promise.all([
    db
      .select({
        topicKey: topicPosts.topicKey,
        replyCount: count(),
        latestReplyAt: max(topicPosts.createdAt),
        uniqueReplierCount: countDistinct(topicPosts.userId),
      })
      .from(topicPosts)
      .where(filter)
      .groupBy(topicPosts.topicKey),
    // DISTINCT ON (topic_key, user_id) keeps only the latest comment
    // each user made on each topic. The DISTINCT ON columns must lead
    // the ORDER BY so Postgres can pick the right "first" row per group;
    // the trailing `desc(createdAt)` makes that "first" row the most
    // recent. JS-side we still sort within a topic to slice the top 3.
    db
      .selectDistinctOn([topicPosts.topicKey, topicPosts.userId], {
        topicKey: topicPosts.topicKey,
        userId: topicPosts.userId,
        createdAt: topicPosts.createdAt,
        ...AUTHOR_PROFILE_COLUMNS,
      })
      .from(topicPosts)
      .leftJoin(profiles, liveProfileJoinOn(topicPosts.userId))
      .where(filter)
      .orderBy(asc(topicPosts.topicKey), asc(topicPosts.userId), desc(topicPosts.createdAt)),
  ]);

  return assembleReplyMeta(
    topicKeys,
    stats,
    (s) => s.topicKey,
    dedupedRepliers,
    (r) => r.topicKey
  );
}

/**
 * The {@link getReplyMetaMap} analog for shared-game comments: total live-comment
 * count, latest comment time, and up to 3 commenter avatars per game, shaped as
 * the same {@link ReplyMeta} so the gallery {@link CatalogListCard} and the home
 * feed render identically to the puzzle / position lists. Keyed by `game_id`
 * over `game_comments` (not the `topic_posts` polymorphic key). Soft-deleted
 * rows are excluded so a retracted comment stops counting.
 *
 * Lives here (not in the `server-only` `game-comments` module) so the home-feed
 * loader graph stays free of `server-only`, matching the other feed loaders.
 */
export async function getGameCommentMetaMap(gameIds: string[]): Promise<Map<string, ReplyMeta>> {
  if (gameIds.length === 0) return new Map();

  const filter = and(inArray(gameComments.gameId, gameIds), isNull(gameComments.deletedAt));

  const [stats, dedupedRepliers] = await Promise.all([
    db
      .select({
        gameId: gameComments.gameId,
        replyCount: count(),
        latestReplyAt: max(gameComments.createdAt),
        uniqueReplierCount: countDistinct(gameComments.authorId),
      })
      .from(gameComments)
      .where(filter)
      .groupBy(gameComments.gameId),
    // Latest comment per (game, author), newest first — bounds transfer to
    // unique commenters × games. Null authors (deleted users) are excluded so
    // the avatar stack lines up with `uniqueReplierCount` (COUNT DISTINCT skips
    // NULLs).
    db
      .selectDistinctOn([gameComments.gameId, gameComments.authorId], {
        gameId: gameComments.gameId,
        authorId: gameComments.authorId,
        createdAt: gameComments.createdAt,
        ...AUTHOR_PROFILE_COLUMNS,
      })
      .from(gameComments)
      .leftJoin(profiles, liveProfileJoinOn(gameComments.authorId))
      .where(and(filter, isNotNull(gameComments.authorId)))
      .orderBy(asc(gameComments.gameId), asc(gameComments.authorId), desc(gameComments.createdAt)),
  ]);

  return assembleReplyMeta(
    gameIds,
    stats,
    (s) => s.gameId,
    dedupedRepliers,
    (r) => r.gameId
  );
}
