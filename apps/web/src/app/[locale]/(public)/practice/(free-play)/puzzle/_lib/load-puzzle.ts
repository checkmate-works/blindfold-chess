import { cache } from 'react';

import { eq } from 'drizzle-orm';

import { db, puzzleSolutions } from '@/lib/db';
import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';
import { getPositionWithProfileById } from '@/lib/positions/queries';

export type PuzzleSolutionRow = {
  solutionMoves: PuzzleSolutionMove[];
};

/**
 * Load a puzzle position (with author profile) and all of its solution rows.
 *
 * Wrapped in React `cache()` so that detail and session server components that
 * happen to render on the same request (not the normal topology, but robust)
 * share a single DB round-trip. `getPositionWithProfileById` is itself
 * `cache()`-wrapped, so the position read is already memoized.
 */
export const loadPuzzleWithSolutions = cache(async (id: string) => {
  const row = await getPositionWithProfileById({ id, type: 'puzzle' });
  if (!row) return null;

  const solutions: PuzzleSolutionRow[] = await db
    .select({
      solutionMoves: puzzleSolutions.solutionMoves,
    })
    .from(puzzleSolutions)
    .where(eq(puzzleSolutions.positionId, row.position.id));

  return { ...row, solutions };
});
