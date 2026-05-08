import { cache } from 'react';

import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';

import { db, profiles, topicPosts } from '@/lib/db';

import type { TopicType } from './constants';
import { attachPostMeta } from './post-meta';
import { authorSelect, sortPosts } from './shared';
import type { PostWithReplyMeta, SortMode, TopicPostWithAuthor } from './shared';

/**
 * Get the count of top-level posts for a specific topic type ('square' or 'opening').
 */
export async function getPostCountByTopicType(topicType: TopicType): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(topicPosts)
    .where(
      and(
        eq(topicPosts.topicType, topicType),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    );
  return result.count;
}

/**
 * Get top-level posts for a specific topicType + topicKey, with author info.
 * Base function shared by squares and openings.
 */
export async function getTopLevelPostsByTopicKey(
  topicType: TopicType,
  topicKey: string
): Promise<TopicPostWithAuthor[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: authorSelect,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.topicType, topicType),
        eq(topicPosts.topicKey, topicKey),
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
 * Get a single post by ID, verifying it belongs to the given topicType + topicKey.
 * Base function shared by squares and openings.
 *
 * Wrapped with `React.cache` so the post-detail metadata generator and
 * page component dedupe to a single lookup per request, both for squares
 * (via `getPostById`) and chunks (called directly).
 */
export const getPostByIdAndTopicKey = cache(
  async (
    postId: string,
    topicType: TopicType,
    topicKey: string
  ): Promise<TopicPostWithAuthor | null> => {
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
          eq(topicPosts.topicType, topicType),
          eq(topicPosts.topicKey, topicKey),
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
);

/**
 * Get the most recent top-level posts for a specific topic type with reply metadata.
 * Base function shared by squares and openings.
 */
export async function getRecentPostsByTopicType(
  topicType: TopicType,
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
        eq(topicPosts.topicType, topicType),
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
 * Get top-level posts for a specific topicType + topicKey with reply metadata, sorted.
 * Base function shared by squares and openings.
 */
export async function getPostsWithReplyMetaByTopicKey(
  topicType: TopicType,
  topicKey: string,
  currentUserId?: string,
  sortBy: SortMode = 'new'
): Promise<PostWithReplyMeta[]> {
  const posts = await getTopLevelPostsByTopicKey(topicType, topicKey);
  const postsWithMeta = await attachPostMeta(posts, currentUserId);

  return sortPosts(postsWithMeta, sortBy);
}

/**
 * Get the count of top-level posts for a specific topicType + topicKey.
 */
export async function getPostCountByTopicKey(
  topicType: TopicType,
  topicKey: string
): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(topicPosts)
    .where(
      and(
        eq(topicPosts.topicType, topicType),
        eq(topicPosts.topicKey, topicKey),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    );
  return result.count;
}

/**
 * Get paginated top-level posts for a specific topicType + topicKey with reply metadata, sorted.
 * Uses SQL-level LIMIT/OFFSET for 'new' sort (the DB default ordering), then attaches meta
 * only for the paginated slice. For 'popular' and 'active' sorts, we must fetch all posts
 * since sorting depends on metadata (like counts, reply timestamps).
 */
export async function getPostsWithReplyMetaPaginatedByTopicKey(
  topicType: TopicType,
  topicKey: string,
  limit: number,
  offset: number,
  currentUserId?: string,
  sortBy: SortMode = 'new'
): Promise<PostWithReplyMeta[]> {
  if (sortBy !== 'new') {
    // For 'popular' and 'active' sorts, we need metadata to sort, so fetch all and slice
    const allPosts = await getPostsWithReplyMetaByTopicKey(
      topicType,
      topicKey,
      currentUserId,
      sortBy
    );
    return allPosts.slice(offset, offset + limit);
  }

  // For 'new' sort, use SQL-level pagination (posts already ordered by createdAt DESC)
  const results = await db
    .select({
      post: topicPosts,
      author: authorSelect,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(
      and(
        eq(topicPosts.topicType, topicType),
        eq(topicPosts.topicKey, topicKey),
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

/**
 * Get top-level posts for a specific topic type with reply metadata, paginated.
 * Base function shared by squares and openings (for simple cases without extra JOINs).
 */
export async function getPostsByTopicTypePaginated(
  topicType: TopicType,
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
        eq(topicPosts.topicType, topicType),
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

/**
 * Get every comment row (top-level posts AND replies) for a given topic in a
 * single query, with author info and like / reply metadata attached.
 *
 * Used by Reddit-style inline tree views (currently `position_memory` and
 * `position_puzzle` parent pages). The caller passes the result to
 * `buildCommentTree` to materialize the parent-child structure on the server.
 *
 * Sort order: `createdAt ASC` so that when the tree is built, sibling
 * replies under the same parent end up in chronological order. Top-level
 * sort (new / popular / active) is applied AFTER tree building, by the
 * caller.
 *
 * Soft-deleted posts ARE included so `buildCommentTree` can keep deleted
 * nodes that still have live descendants and render them as Reddit-style
 * `[deleted]` tombstones. Without them, every reply under a deleted parent
 * would orphan and silently disappear from the thread. `attachPostMeta`'s
 * reply / replier batch queries already filter out deleted rows, so the
 * tombstones do not contribute to reply counts or replier avatar strips.
 */
export async function getCommentTreeForTopic(
  topicType: TopicType,
  topicKey: string,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: authorSelect,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(and(eq(topicPosts.topicType, topicType), eq(topicPosts.topicKey, topicKey)))
    .orderBy(asc(topicPosts.createdAt));

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  return attachPostMeta(posts, currentUserId);
}

/**
 * Get replies for a specific post with like metadata.
 * Topic-generic: works on any postId regardless of topicType.
 *
 * Soft-deleted replies ARE included for the same reason as
 * `getCommentTreeForTopic` — `buildCommentTree` keeps deleted-with-replies
 * nodes as tombstones so descendants stay anchored to their thread.
 */
export async function getRepliesByPostId(
  postId: string,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: authorSelect,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(eq(topicPosts.rootPostId, postId))
    .orderBy(asc(topicPosts.createdAt));

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  return attachPostMeta(posts, currentUserId);
}
