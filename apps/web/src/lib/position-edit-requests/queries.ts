import { cache } from 'react';

import { and, count, desc, eq } from 'drizzle-orm';

import {
  AUTHOR_PROFILE_COLUMNS,
  db,
  positionChunks,
  positionEditRequests,
  profiles,
} from '@/lib/db';
import { UUID_RE } from '@/lib/validations/uuid';

/**
 * Fetch all edit requests for a position, newest first, joined with each
 * proposer's profile (LEFT join so orphaned-author rows still surface with
 * `proposer = null`). Used on the position detail page for both the
 * owner's review surface and the public read of past suggestions.
 */
export const listEditRequestsForPosition = cache(async (positionId: string) => {
  if (!UUID_RE.test(positionId)) return [];

  return db
    .select({
      request: positionEditRequests,
      proposer: AUTHOR_PROFILE_COLUMNS,
    })
    .from(positionEditRequests)
    .leftJoin(profiles, eq(positionEditRequests.proposerId, profiles.id))
    .where(eq(positionEditRequests.positionId, positionId))
    .orderBy(desc(positionEditRequests.createdAt));
});

/**
 * Count pending edit requests for a position. Read by the detail page to
 * render the "N pending suggestions" badge without materializing the full
 * list.
 */
export const countPendingEditRequestsForPosition = cache(async (positionId: string) => {
  if (!UUID_RE.test(positionId)) return 0;

  const [row] = await db
    .select({ value: count() })
    .from(positionEditRequests)
    .where(
      and(
        eq(positionEditRequests.positionId, positionId),
        eq(positionEditRequests.status, 'pending')
      )
    );
  return row?.value ?? 0;
});

/**
 * Count all edit requests (any status) for a position. Used by the detail
 * page to decide whether to surface a "history" entry point even when no
 * request is currently pending.
 */
export const countEditRequestsForPosition = cache(async (positionId: string) => {
  if (!UUID_RE.test(positionId)) return 0;

  const [row] = await db
    .select({ value: count() })
    .from(positionEditRequests)
    .where(eq(positionEditRequests.positionId, positionId));
  return row?.value ?? 0;
});

/**
 * Fetch a single edit request by id. Used by the mutation core to load the
 * row before each transition. No caching — mutations need the freshest
 * read possible.
 */
export async function getPositionEditRequestById(id: string) {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select()
    .from(positionEditRequests)
    .where(eq(positionEditRequests.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Find the viewer's own pending edit request for a position, if any.
 * Returns the request id (used by the detail page to switch the form CTA
 * between "Suggest" and "View / withdraw") or `null` when the viewer has
 * none pending. Anchors the one-pending-per-(position, proposer) invariant
 * the mutation layer enforces.
 */
export const getViewerPendingEditRequestForPosition = cache(
  async (positionId: string, viewerId: string | null): Promise<string | null> => {
    if (!viewerId) return null;
    if (!UUID_RE.test(positionId) || !UUID_RE.test(viewerId)) return null;

    const [row] = await db
      .select({ id: positionEditRequests.id })
      .from(positionEditRequests)
      .where(
        and(
          eq(positionEditRequests.positionId, positionId),
          eq(positionEditRequests.proposerId, viewerId),
          eq(positionEditRequests.status, 'pending')
        )
      )
      .limit(1);

    return row?.id ?? null;
  }
);

/**
 * The current set of chunk IDs linked to a position. Used by the mutation
 * layer for the submit-time no-op check and by the detail page to seed the
 * proposal form / compute the review diff against the live link set.
 */
export const getLinkedChunkIdsForPosition = cache(async (positionId: string): Promise<string[]> => {
  if (!UUID_RE.test(positionId)) return [];
  const rows = await db
    .select({ chunkId: positionChunks.chunkId })
    .from(positionChunks)
    .where(eq(positionChunks.positionId, positionId));
  return rows.map((row) => row.chunkId);
});
