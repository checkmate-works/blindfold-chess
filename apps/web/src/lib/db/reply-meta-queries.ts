import { and, asc, count, countDistinct, desc, eq, inArray, isNull, max } from 'drizzle-orm';

import { db, profiles, topicPosts } from './index';

type Replier = {
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
  const map = new Map<string, ReplyMeta>();
  if (topicKeys.length === 0) return map;

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
        avatarUrl: profiles.avatarUrl,
        displayName: profiles.displayName,
        username: profiles.username,
      })
      .from(topicPosts)
      .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
      .where(filter)
      .orderBy(asc(topicPosts.topicKey), asc(topicPosts.userId), desc(topicPosts.createdAt)),
  ]);

  const statsMap = new Map(stats.map((s) => [s.topicKey, s]));

  // Group deduped rows by topicKey, then sort each group by createdAt
  // DESC and take the most-recent N for display.
  const repliersByKey = new Map<string, typeof dedupedRepliers>();
  for (const row of dedupedRepliers) {
    const arr = repliersByKey.get(row.topicKey) ?? [];
    arr.push(row);
    repliersByKey.set(row.topicKey, arr);
  }

  for (const topicKey of topicKeys) {
    const s = statsMap.get(topicKey);
    const dedupedForKey = repliersByKey.get(topicKey) ?? [];
    const repliers = dedupedForKey
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, MAX_REPLIERS_DISPLAY)
      .map<Replier>((r) => ({
        avatarUrl: r.avatarUrl,
        displayName: r.displayName || r.username || 'Anonymous',
      }));
    map.set(topicKey, {
      replyCount: s?.replyCount ?? 0,
      latestReplyAt: s?.latestReplyAt ?? null,
      repliers,
      uniqueReplierCount: s?.uniqueReplierCount ?? 0,
    });
  }

  return map;
}
