import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { chessOpenings, db, profiles, topicPostRatings, topicPosts } from '@/lib/db';
import type { ChessOpening, Profile, TopicPost, TopicPostRating } from '@/lib/db';

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
