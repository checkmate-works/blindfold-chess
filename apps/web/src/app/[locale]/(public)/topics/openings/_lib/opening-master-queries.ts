import { cache } from 'react';

import { unstable_cache } from 'next/cache';

import { asc, eq } from 'drizzle-orm';

import { OPENINGS_CACHE_TAG } from '@/lib/cache-tags';
import { chessOpenings, db, topicPosts } from '@/lib/db';
import type { ChessOpening } from '@/lib/db';

import { liveTopLevelPosts } from '@/app/[locale]/(public)/topics/_lib/post-filters';

/**
 * Every chess opening ordered by sort_order — the ONE Data Cache entry that
 * all the master lookups in this module are derived from.
 *
 * @design One cached table, in-memory lookups
 * `chess_openings` is code-seeded at deploy (`src/lib/db/seed/openings.ts`
 * is its only writer) and small — a sidebar's worth of rows — so the by-slug
 * and by-square lookups below filter this list in memory instead of each
 * running their own SELECT. What that buys is connections, not query time:
 * the session pooler's budget is shared across every warm instance, and a
 * crawler sweeping the opening topic pages in four locales at once turned
 * the per-slug SELECT into one pooled connection per distinct page. Under
 * that load the pooler refused them (`EMAXCONNSESSION`) and the topic pages
 * failed to render. With a single entry the whole sweep costs one
 * connection per hourly revalidation.
 *
 * The rows are JSON round-tripped by the Data Cache, so `createdAt` /
 * `updatedAt` arrive as strings — no consumer reads them.
 *
 * The per-slug refusal under the 2026-08-22 sweep is Sentry
 * BLINDFOLD-CHESS-61.
 */
export const getOpenings = unstable_cache(
  async (): Promise<ChessOpening[]> => {
    return db.select().from(chessOpenings).orderBy(asc(chessOpenings.sortOrder));
  },
  ['chess-openings'],
  { tags: [OPENINGS_CACHE_TAG], revalidate: 3600 }
);

/**
 * Get openings whose first move targets a specific square.
 * For example, getOpeningsByFirstMoveSquare('e4') returns all 1.e4 openings.
 */
export async function getOpeningsByFirstMoveSquare(square: string): Promise<ChessOpening[]> {
  return (await getOpenings()).filter((o) => o.firstMoveSquare === square);
}

export type OpeningWithChildren = ChessOpening & {
  children: ChessOpening[];
};

/**
 * Fetch all openings and build a tree structure in memory.
 * Root openings (parentSlug is null) are returned with their children nested.
 */
export async function getOpeningsAsTree(): Promise<OpeningWithChildren[]> {
  return buildTree(await getOpenings());
}

/**
 * Same as getOpeningsAsTree but filtered by firstMoveSquare.
 */
export async function getOpeningsAsTreeByFirstMoveSquare(
  square: string
): Promise<OpeningWithChildren[]> {
  return buildTree(await getOpeningsByFirstMoveSquare(square));
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
  return (await getOpenings()).find((o) => o.slug === slug) ?? null;
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
