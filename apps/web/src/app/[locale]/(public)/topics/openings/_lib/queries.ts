import { asc, eq } from 'drizzle-orm';

import { chessOpenings, db } from '@/lib/db';
import type { ChessOpening } from '@/lib/db';

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
