import { and, count, desc, eq, isNull } from 'drizzle-orm';

import { db, profiles, topicPosts } from '@/lib/db';

import {
  attachPostMeta,
  authorSelect,
  getLikeMetaForPost,
  getPostsByUserId,
  getRepliesByPostId,
  sortPosts,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import type {
  LikeMeta,
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  Replier,
  ReplyMeta,
  SortMode,
  TopicPostWithAuthor,
} from '@/app/[locale]/(public)/topics/_lib/queries';

export { attachPostMeta, getPostsByUserId, getLikeMetaForPost, getRepliesByPostId };
export type {
  LikeMeta,
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  Replier,
  ReplyMeta,
  SortMode,
  TopicPostWithAuthor,
};

/**
 * Get top-level posts for a specific square
 */
export async function getPostsForSquare(square: string): Promise<TopicPostWithAuthor[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: authorSelect,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.topicType, 'square'),
        eq(topicPosts.topicKey, square),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
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
      author: authorSelect,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.id, postId),
        eq(topicPosts.topicType, 'square'),
        eq(topicPosts.topicKey, square),
        isNull(topicPosts.deletedAt)
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
 * Get top-level posts for a square with reply metadata, sorted by the given mode.
 */
export async function getPostsWithReplyMeta(
  square: string,
  currentUserId?: string,
  sortBy: SortMode = 'new'
): Promise<PostWithReplyMeta[]> {
  const posts = await getPostsForSquare(square);
  const postsWithMeta = await attachPostMeta(posts, currentUserId);

  return sortPosts(postsWithMeta, sortBy);
}

/**
 * Get the most recent top-level posts across all squares with reply metadata.
 */
export async function getRecentPostsAcrossSquares(
  limit = 5,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: authorSelect,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.topicType, 'square'),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt))
    .limit(limit);

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  return attachPostMeta(posts, currentUserId);
}

/**
 * Get the count of top-level posts across all squares.
 */
export async function getPostCountAcrossSquares(): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(topicPosts)
    .where(
      and(
        eq(topicPosts.topicType, 'square'),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    );
  return result.count;
}

/**
 * Get top-level posts across all squares with reply metadata, paginated.
 */
export async function getPostsAcrossSquaresPaginated(
  limit: number,
  offset: number,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: authorSelect,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.topicType, 'square'),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt))
    .limit(limit)
    .offset(offset);

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  return attachPostMeta(posts, currentUserId);
}
