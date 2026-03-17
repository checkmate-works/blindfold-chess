import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { chessOpenings, db, profiles, topicPostRatings, topicPosts } from '@/lib/db';
import type { ChessOpening, Profile, TopicPost, TopicPostRating } from '@/lib/db';

import {
  attachPostMeta,
  getLikeMetaForPost,
  getRepliesByPostId,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import type {
  LikeMeta,
  PostWithReplyMeta,
  SortMode,
} from '@/app/[locale]/(public)/topics/_lib/queries';

export { getLikeMetaForPost, getRepliesByPostId };
export type { LikeMeta, PostWithReplyMeta, SortMode };

/**
 * Get all chess openings ordered by sort_order.
 */
export async function getOpenings(): Promise<ChessOpening[]> {
  return db.select().from(chessOpenings).orderBy(asc(chessOpenings.sortOrder));
}

/**
 * Get openings whose first move targets a specific square.
 * For example, getOpeningsByFirstMoveSquare('e4') returns all 1.e4 openings.
 */
export async function getOpeningsByFirstMoveSquare(square: string): Promise<ChessOpening[]> {
  return db
    .select()
    .from(chessOpenings)
    .where(eq(chessOpenings.firstMoveSquare, square))
    .orderBy(asc(chessOpenings.sortOrder));
}

/**
 * Get a single opening by its slug.
 * Returns null if the slug does not exist.
 */
export async function getOpeningBySlug(slug: string): Promise<ChessOpening | null> {
  const results = await db
    .select()
    .from(chessOpenings)
    .where(eq(chessOpenings.slug, slug))
    .limit(1);

  return results[0] ?? null;
}

/**
 * Check whether a slug exists in the chess_openings table.
 * Used to validate topicKey for topicType='opening'.
 */
export async function isValidOpening(slug: string): Promise<boolean> {
  const result = await getOpeningBySlug(slug);
  return result !== null;
}

export type OpeningPostWithAuthor = TopicPost & {
  author: Pick<Profile, 'username' | 'displayName' | 'avatarUrl' | 'flair' | 'country'> | null;
  rating: Pick<TopicPostRating, 'preferenceRating' | 'proficiencyRating'> | null;
};

/**
 * Get top-level posts for a specific opening slug, with author and rating info.
 */
export async function getPostsForOpening(slug: string): Promise<OpeningPostWithAuthor[]> {
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
      rating: {
        preferenceRating: topicPostRatings.preferenceRating,
        proficiencyRating: topicPostRatings.proficiencyRating,
      },
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .leftJoin(topicPostRatings, eq(topicPosts.id, topicPostRatings.postId))
    .where(
      and(
        eq(topicPosts.topicType, 'opening'),
        eq(topicPosts.topicKey, slug),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt));

  return results.map((r) => ({
    ...r.post,
    author: r.author,
    rating:
      r.rating?.preferenceRating !== null || r.rating?.proficiencyRating !== null ? r.rating : null,
  }));
}

export type OpeningPostWithReplyMeta = OpeningPostWithAuthor & {
  replyMeta: PostWithReplyMeta['replyMeta'];
  likeMeta: LikeMeta;
};

/**
 * Get a single opening post by ID, verifying it belongs to the given slug.
 */
export async function getOpeningPostById(
  postId: string,
  slug: string
): Promise<OpeningPostWithAuthor | null> {
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
      rating: {
        preferenceRating: topicPostRatings.preferenceRating,
        proficiencyRating: topicPostRatings.proficiencyRating,
      },
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .leftJoin(topicPostRatings, eq(topicPosts.id, topicPostRatings.postId))
    .where(
      and(
        eq(topicPosts.id, postId),
        eq(topicPosts.topicType, 'opening'),
        eq(topicPosts.topicKey, slug),
        isNull(topicPosts.deletedAt)
      )
    )
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const r = results[0];
  return {
    ...r.post,
    author: r.author,
    rating:
      r.rating?.preferenceRating !== null || r.rating?.proficiencyRating !== null ? r.rating : null,
  };
}

/**
 * Get top-level posts for an opening with reply metadata, sorted by the given mode.
 */
export async function getOpeningPostsWithReplyMeta(
  slug: string,
  currentUserId?: string,
  sortBy: SortMode = 'new'
): Promise<OpeningPostWithReplyMeta[]> {
  const posts = await getPostsForOpening(slug);
  const postsWithMeta = await attachPostMeta(posts, currentUserId);

  // Merge rating data back onto the enriched posts
  const ratingMap = new Map(posts.map((p) => [p.id, p.rating]));

  const merged: OpeningPostWithReplyMeta[] = postsWithMeta.map((p) => ({
    ...p,
    rating: ratingMap.get(p.id) ?? null,
  }));

  if (sortBy === 'popular') {
    return merged.sort((a, b) => {
      const likeDiff = b.likeMeta.likeCount - a.likeMeta.likeCount;
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  if (sortBy === 'active') {
    return merged.sort((a, b) => {
      const aLatest = a.replyMeta.latestReplyAt ? new Date(a.replyMeta.latestReplyAt).getTime() : 0;
      const bLatest = b.replyMeta.latestReplyAt ? new Date(b.replyMeta.latestReplyAt).getTime() : 0;
      const replyDiff = bLatest - aLatest;
      if (replyDiff !== 0) return replyDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // 'new' — already sorted by createdAt DESC from getPostsForOpening
  return merged;
}
