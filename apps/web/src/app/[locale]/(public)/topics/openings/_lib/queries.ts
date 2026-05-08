import { cache } from 'react';

import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import { chessOpenings, db, profiles, topicPostRatings, topicPosts } from '@/lib/db';
import type { Profile, TopicPost, TopicPostRating } from '@/lib/db';

import { buildProfilePostQuery } from '@/app/[locale]/(public)/topics/_lib/build-profile-post-query';
import { getLikeMetaForPost } from '@/app/[locale]/(public)/topics/_lib/like-queries';
import {
  attachPostMeta,
  attachProfilePostMeta,
} from '@/app/[locale]/(public)/topics/_lib/post-meta';
import {
  getPostCountByTopicType,
  getRepliesByPostId,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import {
  authorSelect,
  normalizeRating,
  ratingSelect,
  sortPosts,
} from '@/app/[locale]/(public)/topics/_lib/shared';
import type {
  LikeMeta,
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  SortMode,
} from '@/app/[locale]/(public)/topics/_lib/shared';

// Re-export from opening-master-queries for backward compatibility
export {
  buildTree,
  getChildOpenings,
  getOpeningBySlug,
  getOpenings,
  getOpeningsByFirstMoveSquare,
  getOpeningsAsTree,
  getOpeningsAsTreeByFirstMoveSquare,
  hasUserPostedForOpening,
  isValidOpening,
} from './opening-master-queries';
export type { OpeningWithChildren } from './opening-master-queries';

export { getLikeMetaForPost, getRepliesByPostId };
export type { LikeMeta, PostWithReplyMeta, SortMode };

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
      author: authorSelect,
      rating: ratingSelect,
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
    rating: normalizeRating(r.rating),
  }));
}

export type OpeningPostWithReplyMeta = OpeningPostWithAuthor & {
  replyMeta: PostWithReplyMeta['replyMeta'];
  likeMeta: LikeMeta;
};

/**
 * Get a single opening post by ID, verifying it belongs to the given slug.
 *
 * Wrapped with `React.cache` so the metadata generator and the page
 * component dedupe to a single lookup per request on the post detail page.
 */
export const getOpeningPostById = cache(
  async (postId: string, slug: string): Promise<OpeningPostWithAuthor | null> => {
    const results = await db
      .select({
        post: topicPosts,
        author: authorSelect,
        rating: ratingSelect,
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
      rating: normalizeRating(r.rating),
    };
  }
);

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

  return sortPosts(merged, sortBy);
}

/**
 * Get the count of top-level posts across all openings.
 */
export const getPostCountAcrossOpenings = (): Promise<number> => getPostCountByTopicType('opening');

/**
 * Get top-level posts across all openings with reply metadata, paginated.
 * Returns ProfilePostWithReplyMeta for use with TopicPostCard.
 */
export async function getPostsAcrossOpeningsPaginated(
  limit: number,
  offset: number,
  currentUserId?: string
): Promise<ProfilePostWithReplyMeta[]> {
  const results = await buildProfilePostQuery()
    .where(
      and(
        eq(topicPosts.topicType, 'opening'),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt))
    .limit(limit)
    .offset(offset);

  return attachProfilePostMeta(results, currentUserId);
}

/**
 * Get the count of top-level posts across openings filtered by first move square.
 */
export async function getPostCountByFirstMoveSquare(square: string): Promise<number> {
  const openingSlugs = await db
    .select({ slug: chessOpenings.slug })
    .from(chessOpenings)
    .where(eq(chessOpenings.firstMoveSquare, square));

  if (openingSlugs.length === 0) return 0;

  const slugs = openingSlugs.map((o) => o.slug);

  const [result] = await db
    .select({ count: count() })
    .from(topicPosts)
    .where(
      and(
        eq(topicPosts.topicType, 'opening'),
        inArray(topicPosts.topicKey, slugs),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    );
  return result.count;
}

/**
 * Get top-level posts across openings filtered by first move square, paginated.
 */
export async function getPostsByFirstMoveSquarePaginated(
  square: string,
  limit: number,
  offset: number,
  currentUserId?: string
): Promise<ProfilePostWithReplyMeta[]> {
  const openingSlugs = await db
    .select({ slug: chessOpenings.slug })
    .from(chessOpenings)
    .where(eq(chessOpenings.firstMoveSquare, square));

  if (openingSlugs.length === 0) return [];

  const slugs = openingSlugs.map((o) => o.slug);

  const results = await buildProfilePostQuery()
    .where(
      and(
        eq(topicPosts.topicType, 'opening'),
        inArray(topicPosts.topicKey, slugs),
        isNull(topicPosts.parentId),
        isNull(topicPosts.deletedAt)
      )
    )
    .orderBy(desc(topicPosts.createdAt))
    .limit(limit)
    .offset(offset);

  return attachProfilePostMeta(results, currentUserId);
}
