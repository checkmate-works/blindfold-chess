import { and, count, desc, eq, inArray, isNull, max } from 'drizzle-orm';

import { db, profiles, topicPosts } from '@/lib/db';
import type { Profile, TopicPost } from '@/lib/db';

/**
 * Get post counts per square for the board overview
 */
export async function getSquarePostCounts(): Promise<Record<string, number>> {
  const results = await db
    .select({
      topicKey: topicPosts.topicKey,
      count: count(),
    })
    .from(topicPosts)
    .where(and(eq(topicPosts.topicType, 'square'), isNull(topicPosts.parentId)))
    .groupBy(topicPosts.topicKey);

  const counts: Record<string, number> = {};
  for (const row of results) {
    counts[row.topicKey] = row.count;
  }
  return counts;
}

export type TopicPostWithAuthor = TopicPost & {
  author: Pick<Profile, 'username' | 'displayName' | 'avatarUrl'> | null;
};

/**
 * Get top-level posts for a specific square
 */
export async function getPostsForSquare(square: string): Promise<TopicPostWithAuthor[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.topicType, 'square'),
        eq(topicPosts.topicKey, square),
        isNull(topicPosts.parentId)
      )
    )
    .orderBy(desc(topicPosts.createdAt));

  return results.map((r) => ({
    ...r.post,
    author: r.author,
  }));
}

/**
 * Get a single post by ID, verifying it belongs to the given square
 */
export async function getPostById(
  postId: string,
  square: string
): Promise<TopicPostWithAuthor | null> {
  const results = await db
    .select({
      post: topicPosts,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.id, postId),
        eq(topicPosts.topicType, 'square'),
        eq(topicPosts.topicKey, square)
      )
    )
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  return {
    ...results[0].post,
    author: results[0].author,
  };
}

export type Replier = {
  avatarUrl: string | null;
  displayName: string;
};

export type ReplyMeta = {
  replyCount: number;
  latestReplyAt: Date | null;
  repliers: Replier[];
};

export type PostWithReplyMeta = TopicPostWithAuthor & {
  replyMeta: ReplyMeta;
};

/**
 * Get top-level posts for a square with reply metadata (count, latest reply, replier avatars).
 * Uses two batch queries to avoid N+1.
 */
export async function getPostsWithReplyMeta(square: string): Promise<PostWithReplyMeta[]> {
  const posts = await getPostsForSquare(square);

  if (posts.length === 0) {
    return [];
  }

  const postIds = posts.map((p) => p.id);

  // Batch query 1: reply counts and latest reply timestamp per parent
  const replyStats = await db
    .select({
      parentId: topicPosts.parentId,
      replyCount: count(),
      latestReplyAt: max(topicPosts.createdAt),
    })
    .from(topicPosts)
    .where(inArray(topicPosts.parentId, postIds))
    .groupBy(topicPosts.parentId);

  // Batch query 2: replies with author info for replier display
  const repliesWithAuthors = await db
    .select({
      parentId: topicPosts.parentId,
      userId: topicPosts.userId,
      avatarUrl: profiles.avatarUrl,
      displayName: profiles.displayName,
      username: profiles.username,
      createdAt: topicPosts.createdAt,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(inArray(topicPosts.parentId, postIds))
    .orderBy(desc(topicPosts.createdAt));

  // Build lookup maps
  const statsMap = new Map(
    replyStats.map((r) => [
      r.parentId,
      { replyCount: r.replyCount, latestReplyAt: r.latestReplyAt },
    ])
  );

  // Collect up to 3 unique repliers per post (most recent, deduplicated by userId)
  const repliersMap = new Map<string, Replier[]>();
  const seenUsers = new Map<string, Set<string>>();
  for (const row of repliesWithAuthors) {
    if (!row.parentId) continue;
    const seen = seenUsers.get(row.parentId) ?? new Set();
    if (seen.has(row.userId)) continue;
    const existing = repliersMap.get(row.parentId) ?? [];
    if (existing.length >= 3) continue;
    seen.add(row.userId);
    seenUsers.set(row.parentId, seen);
    existing.push({
      avatarUrl: row.avatarUrl,
      displayName: row.displayName || row.username || 'Anonymous',
    });
    repliersMap.set(row.parentId, existing);
  }

  return posts.map((post) => {
    const stats = statsMap.get(post.id);
    return {
      ...post,
      replyMeta: {
        replyCount: stats?.replyCount ?? 0,
        latestReplyAt: stats?.latestReplyAt ?? null,
        repliers: repliersMap.get(post.id) ?? [],
      },
    };
  });
}

/**
 * Get replies for a specific post
 */
export async function getRepliesByPostId(postId: string): Promise<TopicPostWithAuthor[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(eq(topicPosts.parentId, postId))
    .orderBy(desc(topicPosts.createdAt));

  return results.map((r) => ({
    ...r.post,
    author: r.author,
  }));
}
