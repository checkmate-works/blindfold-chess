import { and, count, desc, eq, inArray, isNull, max } from 'drizzle-orm';

import { db, profiles, topicPostLikes, topicPosts } from '@/lib/db';
import type { Profile, TopicPost } from '@/lib/db';

export type TopicPostWithAuthor = TopicPost & {
  author: Pick<Profile, 'username' | 'displayName' | 'avatarUrl' | 'flair' | 'country'> | null;
};

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

export type LikeMeta = {
  likeCount: number;
  likedByMe: boolean;
};

export type PostWithReplyMeta = TopicPostWithAuthor & {
  replyMeta: ReplyMeta;
  likeMeta: LikeMeta;
};

export type SortMode = 'new' | 'popular' | 'active';

/**
 * Attach post metadata (reply counts, replier avatars, like counts) to posts.
 * Uses batch queries to avoid N+1.
 * Topic-generic: works on any postIds regardless of topicType.
 */
export async function attachPostMeta(
  posts: TopicPostWithAuthor[],
  currentUserId?: string
): Promise<PostWithReplyMeta[]> {
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
    .where(and(inArray(topicPosts.parentId, postIds), isNull(topicPosts.deletedAt)))
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
    .where(and(inArray(topicPosts.parentId, postIds), isNull(topicPosts.deletedAt)))
    .orderBy(desc(topicPosts.createdAt));

  // Batch query 3: like counts per post
  const likeCounts = await db
    .select({
      postId: topicPostLikes.postId,
      likeCount: count(),
    })
    .from(topicPostLikes)
    .where(inArray(topicPostLikes.postId, postIds))
    .groupBy(topicPostLikes.postId);

  // Batch query 4: which posts the current user has liked
  let userLikedPostIds = new Set<string>();
  if (currentUserId) {
    const userLikes = await db
      .select({ postId: topicPostLikes.postId })
      .from(topicPostLikes)
      .where(
        and(eq(topicPostLikes.userId, currentUserId), inArray(topicPostLikes.postId, postIds))
      );
    userLikedPostIds = new Set(userLikes.map((l) => l.postId));
  }

  // Build lookup maps
  const statsMap = new Map(
    replyStats.map((r) => [
      r.parentId,
      { replyCount: r.replyCount, latestReplyAt: r.latestReplyAt },
    ])
  );

  const likeCountMap = new Map(likeCounts.map((l) => [l.postId, l.likeCount]));

  // Collect up to 3 unique repliers per post (most recent, deduplicated by userId)
  // while tracking ALL unique repliers for the +N overflow count
  const repliersMap = new Map<string, Replier[]>();
  const seenUsers = new Map<string, Set<string>>();
  for (const row of repliesWithAuthors) {
    if (!row.parentId) continue;
    const seen = seenUsers.get(row.parentId) ?? new Set();
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    seenUsers.set(row.parentId, seen);
    const existing = repliersMap.get(row.parentId) ?? [];
    if (existing.length < 3) {
      existing.push({
        avatarUrl: row.avatarUrl,
        displayName: row.displayName || row.username || 'Anonymous',
      });
      repliersMap.set(row.parentId, existing);
    }
  }

  return posts.map((post) => {
    const stats = statsMap.get(post.id);
    return {
      ...post,
      replyMeta: {
        replyCount: stats?.replyCount ?? 0,
        latestReplyAt: stats?.latestReplyAt ?? null,
        repliers: repliersMap.get(post.id) ?? [],
        uniqueReplierCount: seenUsers.get(post.id)?.size ?? 0,
      },
      likeMeta: {
        likeCount: likeCountMap.get(post.id) ?? 0,
        likedByMe: userLikedPostIds.has(post.id),
      },
    };
  });
}

/**
 * Get like metadata for a single post.
 * Topic-generic: works on any postId regardless of topicType.
 */
export async function getLikeMetaForPost(
  postId: string,
  currentUserId?: string
): Promise<LikeMeta> {
  const [result] = await db
    .select({ count: count() })
    .from(topicPostLikes)
    .where(eq(topicPostLikes.postId, postId));

  let likedByMe = false;
  if (currentUserId) {
    const userLike = await db
      .select({ id: topicPostLikes.id })
      .from(topicPostLikes)
      .where(and(eq(topicPostLikes.userId, currentUserId), eq(topicPostLikes.postId, postId)))
      .limit(1);
    likedByMe = userLike.length > 0;
  }

  return {
    likeCount: result.count,
    likedByMe,
  };
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
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        flair: profiles.flair,
        country: profiles.country,
      },
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .where(and(eq(topicPosts.parentId, postId), isNull(topicPosts.deletedAt)))
    .orderBy(desc(topicPosts.createdAt));

  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  return attachPostMeta(posts, currentUserId);
}
