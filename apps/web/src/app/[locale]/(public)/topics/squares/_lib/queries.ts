import { and, count, desc, eq, isNull } from 'drizzle-orm';

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
