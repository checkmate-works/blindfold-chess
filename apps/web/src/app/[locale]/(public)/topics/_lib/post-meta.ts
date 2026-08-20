import { and, count, desc, eq, inArray, isNull, max } from 'drizzle-orm';

import {
  AUTHOR_PROFILE_COLUMNS,
  db,
  likes,
  liveProfileJoinOn,
  profiles,
  topicPosts,
} from '@/lib/db';
import type { Profile, TopicPost, TopicPostRating } from '@/lib/db';
import type { Replier } from '@/lib/db/reply-meta-queries';

import type { PostWithReplyMeta, ProfilePostWithReplyMeta, TopicPostWithAuthor } from './shared';

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

  // Batch queries 1–4 have no interdependencies; run them in parallel.
  const [replyStats, repliesWithAuthors, likeCounts, userLikes] = await Promise.all([
    // Batch query 1: reply counts and latest reply timestamp per root post.
    // Uses rootPostId so all replies in a flat thread (including reply-to-reply)
    // are counted under the top-level post.
    db
      .select({
        rootPostId: topicPosts.rootPostId,
        replyCount: count(),
        latestReplyAt: max(topicPosts.createdAt),
      })
      .from(topicPosts)
      .where(and(inArray(topicPosts.rootPostId, postIds), isNull(topicPosts.deletedAt)))
      .groupBy(topicPosts.rootPostId),
    // Batch query 2: replies with author info for replier display (grouped by rootPostId)
    db
      .select({
        rootPostId: topicPosts.rootPostId,
        userId: topicPosts.userId,
        ...AUTHOR_PROFILE_COLUMNS,
        createdAt: topicPosts.createdAt,
      })
      .from(topicPosts)
      .leftJoin(profiles, liveProfileJoinOn(topicPosts.userId))
      .where(and(inArray(topicPosts.rootPostId, postIds), isNull(topicPosts.deletedAt)))
      .orderBy(desc(topicPosts.createdAt)),
    // Batch query 3: like counts per post
    db
      .select({
        postId: likes.targetId,
        likeCount: count(),
      })
      .from(likes)
      .where(and(eq(likes.targetType, 'topic_post'), inArray(likes.targetId, postIds)))
      .groupBy(likes.targetId),
    // Batch query 4: which posts the current user has liked
    currentUserId
      ? db
          .select({ postId: likes.targetId })
          .from(likes)
          .where(
            and(
              eq(likes.userId, currentUserId),
              eq(likes.targetType, 'topic_post'),
              inArray(likes.targetId, postIds)
            )
          )
      : Promise.resolve([]),
  ]);

  const userLikedPostIds = new Set(userLikes.map((l) => l.postId));

  // Build lookup maps
  const statsMap = new Map(
    replyStats.map((r) => [
      r.rootPostId,
      { replyCount: r.replyCount, latestReplyAt: r.latestReplyAt },
    ])
  );

  const likeCountMap = new Map(likeCounts.map((l) => [l.postId, l.likeCount]));

  // Unique repliers per root post, in row order. Both the avatar preview and
  // the "+N" overflow count are derived from this one grouping: they used to
  // be two maps mutated in lockstep, with `seenUsers.set` unconditional but
  // `repliersMap.set` nested inside the `length < 3` check — so touching the
  // cap could leave a nonzero count beside an empty avatar list.
  const uniqueRepliersByPost = new Map<string, Replier[]>();
  const seenUserIdsByPost = new Map<string, Set<string>>();
  for (const row of repliesWithAuthors) {
    if (!row.rootPostId) continue;
    // Skip repliers whose author was anonymised (user_id NULL — account purged):
    // there is no distinct profile to dedup by, avatar, or link in the preview.
    if (!row.userId) continue;

    const seen = seenUserIdsByPost.get(row.rootPostId) ?? new Set<string>();
    seenUserIdsByPost.set(row.rootPostId, seen);
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);

    const repliers = uniqueRepliersByPost.get(row.rootPostId) ?? [];
    uniqueRepliersByPost.set(row.rootPostId, repliers);
    repliers.push({
      avatarUrl: row.avatarUrl,
      displayName: row.displayName || row.username || 'Anonymous',
    });
  }

  /** Avatars shown before the "+N" overflow takes over. */
  const REPLIER_PREVIEW_LIMIT = 3;

  return posts.map((post) => {
    const stats = statsMap.get(post.id);
    return {
      ...post,
      replyMeta: {
        replyCount: stats?.replyCount ?? 0,
        latestReplyAt: stats?.latestReplyAt ?? null,
        repliers: (uniqueRepliersByPost.get(post.id) ?? []).slice(0, REPLIER_PREVIEW_LIMIT),
        uniqueReplierCount: uniqueRepliersByPost.get(post.id)?.length ?? 0,
      },
      likeMeta: {
        likeCount: likeCountMap.get(post.id) ?? 0,
        likedByMe: userLikedPostIds.has(post.id),
      },
    };
  });
}

/**
 * Build ProfilePostWithReplyMeta[] from query results that include rating/opening data.
 * Extracts the duplicated pattern of building ratingMap, openingNameMap, openingFenMap,
 * calling attachPostMeta, and merging the maps.
 */
export async function attachProfilePostMeta(
  results: {
    post: TopicPost;
    author: Pick<Profile, 'username' | 'displayName' | 'avatarUrl' | 'flair' | 'country'> | null;
    rating: Pick<TopicPostRating, 'preferenceRating' | 'proficiencyRating'> | null;
    openingName: string | null;
    openingFen: string | null;
  }[],
  currentUserId?: string
): Promise<ProfilePostWithReplyMeta[]> {
  const posts: TopicPostWithAuthor[] = results.map((r) => ({
    ...r.post,
    author: r.author,
  }));

  const ratingMap = new Map(
    results
      .filter((r) => r.rating?.preferenceRating !== null || r.rating?.proficiencyRating !== null)
      .map((r) => [r.post.id, r.rating])
  );

  const openingNameMap = new Map(
    results.filter((r) => r.openingName !== null).map((r) => [r.post.id, r.openingName])
  );

  const openingFenMap = new Map(
    results.filter((r) => r.openingFen !== null).map((r) => [r.post.id, r.openingFen])
  );

  const postsWithMeta = await attachPostMeta(posts, currentUserId);

  return postsWithMeta.map((p) => ({
    ...p,
    topicKey: p.topicKey,
    rating: ratingMap.get(p.id) ?? null,
    openingName: openingNameMap.get(p.id) ?? null,
    openingFen: openingFenMap.get(p.id) ?? null,
  }));
}
