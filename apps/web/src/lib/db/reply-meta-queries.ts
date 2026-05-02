import { and, count, desc, eq, inArray, isNull, max } from 'drizzle-orm';

import { db, profiles, topicPosts } from './index';

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

/**
 * Polymorphic reply-meta lookup — for a list of topics identified by
 * `(topicType, topicKey)`, return the total comment count, the latest
 * comment timestamp, and up to 3 unique commenter avatars per topic.
 *
 * "Topic" here is the same `(topicType, topicKey)` shape that the
 * `topicPosts` table uses to attach a discussion thread to any
 * polymorphic owner — opening, square, position-memory puzzle, etc.
 *
 * The aggregate counts include both root-level comments and their
 * replies, so a list-page badge of "X comments" reflects total
 * discussion volume on the topic. (Compare {@link attachPostMeta},
 * which aggregates replies under a single root post — different shape,
 * different keying.)
 */
export async function getReplyMetaMap(
  topicType: string,
  topicKeys: string[]
): Promise<Map<string, ReplyMeta>> {
  const map = new Map<string, ReplyMeta>();
  if (topicKeys.length === 0) return map;

  const [stats, repliesWithAuthors] = await Promise.all([
    db
      .select({
        topicKey: topicPosts.topicKey,
        replyCount: count(),
        latestReplyAt: max(topicPosts.createdAt),
      })
      .from(topicPosts)
      .where(
        and(
          eq(topicPosts.topicType, topicType),
          inArray(topicPosts.topicKey, topicKeys),
          isNull(topicPosts.deletedAt)
        )
      )
      .groupBy(topicPosts.topicKey),
    db
      .select({
        topicKey: topicPosts.topicKey,
        userId: topicPosts.userId,
        avatarUrl: profiles.avatarUrl,
        displayName: profiles.displayName,
        username: profiles.username,
      })
      .from(topicPosts)
      .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
      .where(
        and(
          eq(topicPosts.topicType, topicType),
          inArray(topicPosts.topicKey, topicKeys),
          isNull(topicPosts.deletedAt)
        )
      )
      .orderBy(desc(topicPosts.createdAt)),
  ]);

  const statsMap = new Map(
    stats.map((s) => [s.topicKey, { replyCount: s.replyCount, latestReplyAt: s.latestReplyAt }])
  );

  // Collect up to 3 unique repliers per topicKey (most recent first,
  // dedup by userId) while tracking ALL unique repliers for the +N
  // overflow count. Mirrors the algorithm used by `attachPostMeta`.
  const repliersMap = new Map<string, Replier[]>();
  const seenUsers = new Map<string, Set<string>>();
  for (const row of repliesWithAuthors) {
    const seen = seenUsers.get(row.topicKey) ?? new Set<string>();
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    seenUsers.set(row.topicKey, seen);
    const existing = repliersMap.get(row.topicKey) ?? [];
    if (existing.length < MAX_REPLIERS_DISPLAY) {
      existing.push({
        avatarUrl: row.avatarUrl,
        displayName: row.displayName || row.username || 'Anonymous',
      });
      repliersMap.set(row.topicKey, existing);
    }
  }

  for (const topicKey of topicKeys) {
    const stats = statsMap.get(topicKey);
    map.set(topicKey, {
      replyCount: stats?.replyCount ?? 0,
      latestReplyAt: stats?.latestReplyAt ?? null,
      repliers: repliersMap.get(topicKey) ?? [],
      uniqueReplierCount: seenUsers.get(topicKey)?.size ?? 0,
    });
  }

  return map;
}
