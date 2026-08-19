import { cache } from 'react';

import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import {
  SOCIAL_AUTHOR_COLUMNS,
  chessOpenings,
  db,
  liveProfileJoinOn,
  profiles,
  topicPostRatings,
  topicPosts,
} from '@/lib/db';
import type { Profile, TopicPost, TopicPostRating } from '@/lib/db';
import type { LikeMeta } from '@/lib/db/like-queries';
import { countRows } from '@/lib/db/list-query';
import { UUID_RE } from '@/lib/validations/uuid';

import { buildProfilePostQuery } from '@/app/[locale]/(public)/topics/_lib/build-profile-post-query';
import {
  attachPostMeta,
  attachProfilePostMeta,
} from '@/app/[locale]/(public)/topics/_lib/post-meta';
import { getPostCountByTopicType } from '@/app/[locale]/(public)/topics/_lib/queries';
import {
  normalizeRating,
  ratingSelect,
  sortPosts,
} from '@/app/[locale]/(public)/topics/_lib/shared';
import type {
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  SortMode,
} from '@/app/[locale]/(public)/topics/_lib/shared';

// Re-export from opening-master-queries for backward compatibility
export {
  getOpeningBySlug,
  getOpenings,
  getOpeningsByFirstMoveSquare,
  getOpeningsAsTree,
  getOpeningsAsTreeByFirstMoveSquare,
  hasUserPostedForOpening,
  isValidOpening,
} from './opening-master-queries';
export type { OpeningWithChildren } from './opening-master-queries';

export type OpeningPostWithAuthor = TopicPost & {
  author: Pick<Profile, 'username' | 'displayName' | 'avatarUrl' | 'flair' | 'country'> | null;
  rating: Pick<TopicPostRating, 'preferenceRating' | 'proficiencyRating'> | null;
};

/**
 * Get top-level posts for a specific opening slug, with author and rating info.
 */
async function getPostsForOpening(slug: string): Promise<OpeningPostWithAuthor[]> {
  const results = await db
    .select({
      post: topicPosts,
      author: SOCIAL_AUTHOR_COLUMNS,
      rating: ratingSelect,
    })
    .from(topicPosts)
    .leftJoin(profiles, liveProfileJoinOn(topicPosts.userId))
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
    // URL-supplied postId — reject non-UUID input before it reaches Postgres,
    // where `eq(topicPosts.id, "1")` would throw `invalid input syntax for type uuid`
    // and surface as a 500. Caller treats null as 404.
    if (!UUID_RE.test(postId)) {
      return null;
    }

    const results = await db
      .select({
        post: topicPosts,
        author: SOCIAL_AUTHOR_COLUMNS,
        rating: ratingSelect,
      })
      .from(topicPosts)
      .leftJoin(profiles, liveProfileJoinOn(topicPosts.userId))
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
 * Resolve the slugs of every opening whose first move lands on `square`.
 * Shared by the first-move-square count and paginated-listing queries.
 */
async function getOpeningSlugsByFirstMoveSquare(square: string): Promise<string[]> {
  const rows = await db
    .select({ slug: chessOpenings.slug })
    .from(chessOpenings)
    .where(eq(chessOpenings.firstMoveSquare, square));

  return rows.map((o) => o.slug);
}

/**
 * Get top-level opening posts (with profile-card meta), paginated. `extra`
 * narrows the set further (e.g. a first-move-square slug filter); pass
 * `undefined` for all openings — `and()` drops the undefined operand.
 */
async function getProfileOpeningPostsPaginated(
  extra: SQL | undefined,
  limit: number,
  offset: number,
  currentUserId?: string
): Promise<ProfilePostWithReplyMeta[]> {
  const results = await buildProfilePostQuery()
    .where(
      and(
        eq(topicPosts.topicType, 'opening'),
        extra,
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
 * Get the count of top-level posts across all openings.
 */
export const getPostCountAcrossOpenings = (): Promise<number> => getPostCountByTopicType('opening');

/**
 * Get top-level posts across all openings with reply metadata, paginated.
 * Returns ProfilePostWithReplyMeta for use with TopicPostCard.
 */
export const getPostsAcrossOpeningsPaginated = (
  limit: number,
  offset: number,
  currentUserId?: string
): Promise<ProfilePostWithReplyMeta[]> =>
  getProfileOpeningPostsPaginated(undefined, limit, offset, currentUserId);

/**
 * Get the count of top-level posts across openings filtered by first move square.
 */
export async function getPostCountByFirstMoveSquare(square: string): Promise<number> {
  const slugs = await getOpeningSlugsByFirstMoveSquare(square);

  if (slugs.length === 0) return 0;

  return countRows(
    topicPosts,
    and(
      eq(topicPosts.topicType, 'opening'),
      inArray(topicPosts.topicKey, slugs),
      isNull(topicPosts.parentId),
      isNull(topicPosts.deletedAt)
    )
  );
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
  const slugs = await getOpeningSlugsByFirstMoveSquare(square);

  if (slugs.length === 0) return [];

  return getProfileOpeningPostsPaginated(
    inArray(topicPosts.topicKey, slugs),
    limit,
    offset,
    currentUserId
  );
}
