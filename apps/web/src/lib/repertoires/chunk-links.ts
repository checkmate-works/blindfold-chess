import { and, desc, eq, inArray } from 'drizzle-orm';

import { db, liveProfileJoinOn, profiles, repertoireChunks, repertoires } from '@/lib/db';

import type { RepertoireCardRow, RepertoireWithProfile } from './queries';
import { REPERTOIRE_CARD_COLUMNS, publicRepertoiresOnly, toCards } from './queries';
import { resolveLinePositionsForKeys } from './resolve-line-position';

/** A place in the course where the chunk applies — the `?move=` deep link. */
export type ChunkLinkedRepertoirePosition = {
  positionKey: string;
  /** 1-based, immutable line number (the `[lineNo]` URL segment). */
  lineNo: number;
  /** 1-based half-move, matching the line page's `initialPly` / `?move=`. */
  ply: number;
};

export type ChunkLinkedRepertoire = RepertoireWithProfile & {
  /**
   * The linked positions this course still reaches, resolved to concrete
   * line/ply deep links, in newest-link-first order. Never empty — a course
   * whose every linked position has been edited away is dropped from the
   * list entirely (see below).
   */
  positions: ChunkLinkedRepertoirePosition[];
};

/**
 * Public kata that link a given chunk (the reverse of the line page's chunk
 * list), newest link first, deduped to one entry per course with its linked
 * positions resolved to (lineNo, ply) deep links. The repertoires counterpart
 * of `listGamesLinkingChunk`, with two twists a game doesn't have:
 *
 * - **Visibility**: only `public` courses. Repertoires have coin-gated
 *   `private` / `followers_only` tiers (and a `building` state) that a public
 *   listing must never reveal — filtering to `public` keeps this list
 *   viewer-independent, so there is nothing to leak. See the
 *   `repertoire_chunks` schema TSDoc for the full backlink-visibility
 *   rationale.
 *
 * - **Deep links need resolving**: links are keyed by `position_key`, not a
 *   ply, so each course's keys are replayed against its current lines
 *   (`resolveLinePositionsForKeys`) to find where the position lives today.
 *   A key no live line reaches is an orphaned link (the position was edited
 *   away) and resolves to nothing; a course left with zero resolvable keys is
 *   dropped — mirroring the line page, which simply stops rendering such
 *   links, and avoiding a card that would deep-link nowhere.
 */
export async function listRepertoiresLinkingChunk(
  chunkId: string,
  limit = 50
): Promise<ChunkLinkedRepertoire[]> {
  // 1. Which public courses link this chunk, and at which positions. Newest
  //    link first so the most recently-tagged courses lead the list.
  const linkRows = await db
    .select({
      repertoireId: repertoireChunks.repertoireId,
      positionKey: repertoireChunks.positionKey,
    })
    .from(repertoireChunks)
    .innerJoin(repertoires, eq(repertoires.id, repertoireChunks.repertoireId))
    .where(and(eq(repertoireChunks.chunkId, chunkId), publicRepertoiresOnly()))
    .orderBy(desc(repertoireChunks.createdAt), desc(repertoireChunks.id));

  // 2. Group by course, preserving first-seen (newest-link) order. Keys are
  //    already unique per course (the table's unique constraint).
  const keysByRepertoire = new Map<string, string[]>();
  for (const row of linkRows) {
    const bucket = keysByRepertoire.get(row.repertoireId);
    if (bucket) bucket.push(row.positionKey);
    else keysByRepertoire.set(row.repertoireId, [row.positionKey]);
  }
  const repertoireIds = [...keysByRepertoire.keys()].slice(0, limit);
  if (repertoireIds.length === 0) return [];

  // 3. Hydrate the card projection and resolve each course's position keys
  //    against its current lines, concurrently — the resolutions are
  //    per-course independent replays.
  const [cards, resolutions] = await Promise.all([
    db
      .select(REPERTOIRE_CARD_COLUMNS)
      .from(repertoires)
      .leftJoin(profiles, liveProfileJoinOn(repertoires.userId))
      .where(inArray(repertoires.id, repertoireIds))
      .then((rows: RepertoireCardRow[]) => toCards(rows)),
    Promise.all(
      repertoireIds.map((id) => resolveLinePositionsForKeys(id, keysByRepertoire.get(id)!))
    ),
  ]);
  const cardById = new Map(cards.map((c) => [c.repertoire.id, c]));

  // 4. Restore newest-link order and attach the resolved positions, dropping
  //    orphaned keys and fully-orphaned courses.
  return repertoireIds.flatMap((id, i) => {
    const card = cardById.get(id);
    if (!card) return [];
    const resolved = resolutions[i];
    const positions = keysByRepertoire.get(id)!.flatMap((positionKey) => {
      const place = resolved.get(positionKey);
      return place ? [{ positionKey, ...place }] : [];
    });
    if (positions.length === 0) return [];
    return [{ ...card, positions }];
  });
}
