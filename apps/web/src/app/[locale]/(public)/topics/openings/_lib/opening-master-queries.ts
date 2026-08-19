import { cache } from 'react';

import { unstable_cache } from 'next/cache';

import { asc, eq } from 'drizzle-orm';

import { chessOpenings, db, topicPosts } from '@/lib/db';
import type { ChessOpening } from '@/lib/db';

import { liveTopLevelPosts } from '@/app/[locale]/(public)/topics/_lib/post-filters';

/**
 * Get all chess openings ordered by sort_order.
 */
export const getOpenings = unstable_cache(
  async (): Promise<ChessOpening[]> => {
    return db.select().from(chessOpenings).orderBy(asc(chessOpenings.sortOrder));
  },
  ['chess-openings'],
  { tags: ['openings'], revalidate: 3600 }
);

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

export type OpeningWithChildren = ChessOpening & {
  children: ChessOpening[];
};

/**
 * Fetch all openings and build a tree structure in memory.
 * Root openings (parentSlug is null) are returned with their children nested.
 */
export async function getOpeningsAsTree(): Promise<OpeningWithChildren[]> {
  const all = await db.select().from(chessOpenings).orderBy(asc(chessOpenings.sortOrder));
  return buildTree(all);
}

/**
 * Same as getOpeningsAsTree but filtered by firstMoveSquare.
 */
export async function getOpeningsAsTreeByFirstMoveSquare(
  square: string
): Promise<OpeningWithChildren[]> {
  const all = await db
    .select()
    .from(chessOpenings)
    .where(eq(chessOpenings.firstMoveSquare, square))
    .orderBy(asc(chessOpenings.sortOrder));
  return buildTree(all);
}

/**
 * Build a tree from a flat list of openings.
 * Roots are openings with parentSlug === null.
 * Children are grouped under their parent.
 */
function buildTree(openings: ChessOpening[]): OpeningWithChildren[] {
  const childrenByParent = new Map<string, ChessOpening[]>();

  for (const opening of openings) {
    if (opening.parentSlug) {
      const siblings = childrenByParent.get(opening.parentSlug) ?? [];
      siblings.push(opening);
      childrenByParent.set(opening.parentSlug, siblings);
    }
  }

  return openings
    .filter((o) => o.parentSlug === null)
    .map((root) => ({
      ...root,
      children: childrenByParent.get(root.slug) ?? [],
    }));
}

/**
 * Get a single opening by its slug.
 * Returns null if the slug does not exist.
 *
 * Wrapped with `React.cache` so the metadata generator and the page
 * component dedupe to a single lookup per request (same pattern as
 * `getProfileByUsername`, `getPublishedArticle`, etc.).
 */
export const getOpeningBySlug = cache(async (slug: string): Promise<ChessOpening | null> => {
  const results = await db
    .select()
    .from(chessOpenings)
    .where(eq(chessOpenings.slug, slug))
    .limit(1);

  return results[0] ?? null;
});

/**
 * Check whether a slug exists in the chess_openings table.
 * Used to validate topicKey for topicType='opening'.
 */
export async function isValidOpening(slug: string): Promise<boolean> {
  const result = await getOpeningBySlug(slug);
  return result !== null;
}

/**
 * Check whether a user has posted a top-level post for a specific opening.
 */
export async function hasUserPostedForOpening(userId: string, slug: string): Promise<boolean> {
  const result = await db
    .select({ id: topicPosts.id })
    .from(topicPosts)
    .where(
      liveTopLevelPosts('opening', eq(topicPosts.topicKey, slug), eq(topicPosts.userId, userId))
    )
    .limit(1);

  return result.length > 0;
}
