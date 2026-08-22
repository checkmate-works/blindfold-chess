import { unstable_cache } from 'next/cache';

import { asc } from 'drizzle-orm';

import { OPENINGS_CACHE_TAG } from '@/lib/cache-tags';
import { chessOpenings, db } from '@/lib/db';
import type { ChessOpening } from '@/lib/db';

/**
 * Every chess opening ordered by sort_order — the ONE Data Cache entry that
 * every opening lookup in the app is derived from.
 *
 * @design One cached table, in-memory lookups
 * `chess_openings` is code-seeded at deploy (`src/lib/db/seed/openings.ts`
 * is its only writer) and small — a sidebar's worth of rows — so the by-slug,
 * by-square and by-id lookups elsewhere filter this list in memory instead of
 * each running their own SELECT. What that buys is connections, not query
 * time: the session pooler's budget is shared across every warm instance, and
 * a crawler sweeping the opening topic pages in four locales at once turned
 * the per-slug SELECT into one pooled connection per distinct page. Under
 * that load the pooler refused them (`EMAXCONNSESSION`) and the topic pages
 * failed to render. With a single entry the whole sweep costs one connection
 * per hourly revalidation.
 *
 * The rows are JSON round-tripped by the Data Cache, so `createdAt` /
 * `updatedAt` arrive as strings — no consumer reads them.
 *
 * This lives in `@/lib` rather than beside the topic pages that first needed
 * it because the readers span the app: the topic pages, the new-game and
 * interview opening pickers, the repertoire picker, and game-opening
 * detection. A second cached copy of the same table is the thing to avoid —
 * derive from here.
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
