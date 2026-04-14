import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';

import { db, profiles, topicPosts } from '@/lib/db';

import { attachPostMeta } from './post-meta';
import { authorSelect, sortPosts } from './shared';
import type { PostWithReplyMeta, SortMode, TopicPostWithAuthor } from './shared';

// Re-export shared types and functions for backward compatibility
export { attachPostMeta, attachProfilePostMeta } from './post-meta';
export { authorSelect, ratingSelect, sortPosts } from './shared';
export type {
  LikeMeta,
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  Replier,
  ReplyMeta,
  SortMode,
  TopicPostWithAuthor,
} from './shared';

// Re-export from split modules for backward compatibility
export { getLikeMetaForPost, getLikedPostCountByUser, getLikedPostsByUser } from './like-queries';
export { getPostCountByUserId, getPostsByUserId } from './user-post-queries';
export { getPostCountAcrossTopics, getPostsAcrossTopicsPaginated } from './cross-topic-queries';

/**
 * Get the count of top-level posts for a specific topic type ('square' or 'opening').
 */
export async function getPostCountByTopicType(topicType: 'square' | 'opening'): Promise<number> {
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
  topicType: 'square' | 'opening',
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
 */
export async function getPostByIdAndTopicKey(
  postId: string,
  topicType: 'square' | 'opening',
  topicKey: string
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

/**
 * Get the most recent top-level posts for a specific topic type with reply metadata.
 * Base function shared by squares and openings.
 */
export async function getRecentPostsByTopicType(
  topicType: 'square' | 'opening',
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
  topicType: 'square' | 'opening',
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
  topicType: 'square' | 'opening',
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
  topicType: 'square' | 'opening',
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
  topicType: 'square' | 'opening',
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
 * Get replies for a specific post with like metadata.
 * Topic-generic: works on any postId regardless of topicType.
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
    .where(and(eq(topicPosts.rootPostId, postId), isNull(topicPosts.deletedAt)))
    .orderBy(asc(topicPosts.createdAt));

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  return attachPostMeta(posts, currentUserId);
}
