import type { PuzzleSolutionMove } from '@blindfold-chess/features/puzzle';
import { and, desc, eq, isNull } from 'drizzle-orm';
import 'server-only';

import { db, puzzleSolutions } from '@/lib/db';
import { featuredPuzzles, positions } from '@/lib/db/schema';
import { getDailyPuzzle } from '@/lib/positions/queries';
import { isValidUUID } from '@/lib/validations/uuid';

/**
 * The puzzles the app offers: the Daily Puzzle and the rest of the featured
 * set — the ones the operators picked (`featured_puzzles`). The app does not
 * browse the whole user-submitted pool: everything it shows is curated, so
 * it carries no unmoderated user content (apps/mobile/CLAUDE.md). Authors,
 * likes and comments are left out for the same reason.
 */
export type MobilePuzzleSummary = { id: string; title: string; fen: string };

export type MobilePuzzle = MobilePuzzleSummary & {
  description: string | null;
  solutions: PuzzleSolutionMove[][];
};

const LIVE_FEATURED = and(eq(positions.type, 'puzzle'), isNull(positions.deletedAt));

export async function listMobilePuzzles(): Promise<{
  daily: MobilePuzzleSummary | null;
  featured: MobilePuzzleSummary[];
}> {
  const [daily, featured] = await Promise.all([
    getDailyPuzzle(),
    db
      .select({ id: positions.id, title: positions.title, fen: positions.fen })
      .from(featuredPuzzles)
      .innerJoin(positions, eq(positions.id, featuredPuzzles.positionId))
      .where(LIVE_FEATURED)
      .orderBy(desc(featuredPuzzles.featuredAt)),
  ]);
  return {
    daily: daily ? { id: daily.id, title: daily.title, fen: daily.fen } : null,
    featured,
  };
}

/** A featured puzzle with its solution lines, or null if it is not one. */
export async function getMobilePuzzle(id: string): Promise<MobilePuzzle | null> {
  if (!isValidUUID(id)) return null;
  const [row] = await db
    .select({
      id: positions.id,
      title: positions.title,
      fen: positions.fen,
      description: positions.description,
    })
    .from(featuredPuzzles)
    .innerJoin(positions, eq(positions.id, featuredPuzzles.positionId))
    .where(and(eq(featuredPuzzles.positionId, id), LIVE_FEATURED))
    .limit(1);
  if (!row) return null;
  const solutions = await db
    .select({ solutionMoves: puzzleSolutions.solutionMoves })
    .from(puzzleSolutions)
    .where(eq(puzzleSolutions.positionId, id));
  return { ...row, solutions: solutions.map((s) => s.solutionMoves) };
}
