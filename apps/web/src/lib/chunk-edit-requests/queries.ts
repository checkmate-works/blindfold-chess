import { cache } from 'react';

import { and, count, desc, eq } from 'drizzle-orm';

import { chunkEditRequests, db, profiles } from '@/lib/db';
import { UUID_RE } from '@/lib/validations/uuid';

/**
 * Author profile fields surfaced alongside an edit request — minimal
 * subset matching what `UserAvatar` needs. Mirrors the shape returned by
 * `listChunksWithProfile` / `listPositionsWithProfile`.
 */
const PROFILE_SELECT = {
  username: profiles.username,
  displayName: profiles.displayName,
  avatarUrl: profiles.avatarUrl,
} as const;

/**
 * Fetch all edit requests for a chunk, newest first, joined with each
 * proposer's profile (LEFT join so orphaned-author rows still surface
 * with `profile = null`).
 *
 * Used on the chunk detail page for both the owner's review surface
 * and the public read of past suggestions. The application layer
 * filters by status when only pending requests need rendering.
 */
export const listEditRequestsForChunk = cache(async (chunkId: string) => {
  if (!UUID_RE.test(chunkId)) return [];

  return db
    .select({
      request: chunkEditRequests,
      proposer: PROFILE_SELECT,
    })
    .from(chunkEditRequests)
    .leftJoin(profiles, eq(chunkEditRequests.proposerId, profiles.id))
    .where(eq(chunkEditRequests.chunkId, chunkId))
    .orderBy(desc(chunkEditRequests.createdAt));
});

/**
 * Count pending edit requests for a chunk. Read by the detail page
 * to render the "N pending suggestions" badge without materializing
 * the full list when the count is all that's needed.
 */
export const countPendingEditRequestsForChunk = cache(async (chunkId: string) => {
  if (!UUID_RE.test(chunkId)) return 0;

  const [row] = await db
    .select({ value: count() })
    .from(chunkEditRequests)
    .where(and(eq(chunkEditRequests.chunkId, chunkId), eq(chunkEditRequests.status, 'pending')));
  return row?.value ?? 0;
});

/**
 * Fetch a single edit request by id. Used by the mutation core to load
 * the row + the parent chunk's owner / status in one place before each
 * transition. No caching — mutations need the freshest read possible.
 */
export async function getEditRequestById(id: string) {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select()
    .from(chunkEditRequests)
    .where(eq(chunkEditRequests.id, id))
    .limit(1);
  return row ?? null;
}
