import { cache } from 'react';

import type { Position } from '@/lib/db/schema';

import { listPositions } from './queries';

/** How many cards the "next / other positions" grid shows. */
export const NEXT_POSITION_COUNT = 4;

/**
 * Over-fetch margin per tier. Each tier is read with this many rows so that
 * dropping the current puzzle (and, for the newest tier, rows already taken
 * from the author tier) still leaves enough to fill the grid in the common
 * case. When the whole catalog is smaller than this the grid simply shows
 * fewer cards — the merge never pads with duplicates.
 */
const CANDIDATE_FETCH_LIMIT = NEXT_POSITION_COUNT + 2;

type Tier = readonly Position[];

/**
 * Merge candidate tiers into the ordered list of positions to offer next.
 * Tiers are consumed in order (earlier tiers rank higher), the position the
 * reader is already on is dropped, duplicates across tiers are collapsed on
 * id, and the result is capped at `NEXT_POSITION_COUNT`.
 *
 * Pure so the ranking rule is unit-testable without a database; the tiers
 * themselves come from {@link loadNextPositions}.
 */
export function mergeNextPositionCandidates(
  currentPositionId: string,
  tiers: readonly Tier[],
  limit: number = NEXT_POSITION_COUNT
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
 * Positions of the same kind to offer as "try another", both right after a
 * solve and on a position's own page.
 *
 * Ranking is two-tiered: others by the same author first (newest first), then
 * the newest overall to fill the remaining slots. The author tier exists
 * because both surfaces already attribute the position to its author and link
 * to their list — the cards make that link's destination visible without a
 * round trip. Positions by a deleted or anonymous author (`userId` null) skip
 * the author tier.
 *
 * `type` never mixes the two catalogs. A puzzle asks for the best move and a
 * memory position asks you to reconstruct it; offering one in the other's grid
 * would be offering a different task under the same heading.
 *
 * Deliberately not filtered by "already solved": free-play solves grant an
 * EXP event but do not record which position was solved, so there is nothing
 * server-side to filter on. The current position is the only exclusion.
 *
 * Wrapped in React `cache()` so a page and its metadata / skeleton siblings
 * share one read per request.
 */
export const loadNextPositions = cache(
  async (current: Pick<Position, 'id' | 'userId'>, type: 'puzzle' | 'memory') => {
    const [byAuthor, newest] = await Promise.all([
      current.userId
        ? listPositions({
            type,
            userId: current.userId,
            limit: CANDIDATE_FETCH_LIMIT,
            offset: 0,
          })
        : Promise.resolve([] as Position[]),
      listPositions({ type, limit: CANDIDATE_FETCH_LIMIT, offset: 0 }),
    ]);

    return mergeNextPositionCandidates(current.id, [byAuthor, newest]);
  }
);
