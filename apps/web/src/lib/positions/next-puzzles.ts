import { cache } from 'react';

import type { Position } from '@/lib/db/schema';

import { listPositions } from './queries';

/** How many "next puzzle" cards the result screen shows. */
export const NEXT_PUZZLE_COUNT = 4;

/**
 * Over-fetch margin per tier. Each tier is read with this many rows so that
 * dropping the current puzzle (and, for the newest tier, rows already taken
 * from the author tier) still leaves enough to fill the grid in the common
 * case. When the whole catalog is smaller than this the grid simply shows
 * fewer cards — the merge never pads with duplicates.
 */
const CANDIDATE_FETCH_LIMIT = NEXT_PUZZLE_COUNT + 2;

type Tier = readonly Position[];

/**
 * Merge candidate tiers into the ordered list of puzzles to show after a
 * solve. Tiers are consumed in order (earlier tiers rank higher), the puzzle
 * that was just solved is dropped, duplicates across tiers are collapsed on
 * id, and the result is capped at `NEXT_PUZZLE_COUNT`.
 *
 * Pure so the ranking rule is unit-testable without a database; the tiers
 * themselves come from {@link loadNextPuzzles}.
 */
export function mergeNextPuzzleCandidates(
  currentPositionId: string,
  tiers: readonly Tier[],
  limit: number = NEXT_PUZZLE_COUNT
): Position[] {
  const seen = new Set<string>([currentPositionId]);
  const merged: Position[] = [];

  for (const tier of tiers) {
    for (const position of tier) {
      if (merged.length >= limit) return merged;
      if (seen.has(position.id)) continue;
      seen.add(position.id);
      merged.push(position);
    }
  }

  return merged;
}

/**
 * Puzzles to offer as "solve another" right after a solve.
 *
 * Ranking is two-tiered: other puzzles by the same author first (newest
 * first), then the newest puzzles overall to fill the remaining slots. The
 * author tier exists because the result screen already attributes the puzzle
 * to its author and links to their list — the cards make that link's
 * destination visible without a round trip. Puzzles by a deleted or
 * anonymous author (`userId` null) skip the author tier.
 *
 * Deliberately not filtered by "already solved": free-play solves grant an
 * EXP event but do not record which puzzle was solved, so there is nothing
 * server-side to filter on. The current puzzle is the only exclusion.
 *
 * Wrapped in React `cache()` so a page and its metadata / skeleton siblings
 * share one read per request.
 */
export const loadNextPuzzles = cache(async (current: Pick<Position, 'id' | 'userId'>) => {
  const [byAuthor, newest] = await Promise.all([
    current.userId
      ? listPositions({
          type: 'puzzle',
          userId: current.userId,
          limit: CANDIDATE_FETCH_LIMIT,
          offset: 0,
        })
      : Promise.resolve([] as Position[]),
    listPositions({ type: 'puzzle', limit: CANDIDATE_FETCH_LIMIT, offset: 0 }),
  ]);

  return mergeNextPuzzleCandidates(current.id, [byAuthor, newest]);
});
