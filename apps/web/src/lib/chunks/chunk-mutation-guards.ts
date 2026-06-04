import { and, eq } from 'drizzle-orm';

import { chunkEditRequests } from '@/lib/db';
import type { db } from '@/lib/db';

/**
 * Ownership / soft-delete guard shared by the update, publish, and delete
 * chunk mutations. Run AFTER the caller's own `notFound` check (which also
 * narrows the row to non-undefined), so this only covers the two remaining
 * common rejections.
 *
 * @returns an error result to short-circuit, or `null` when the caller may
 *   proceed.
 */
export function guardChunkOwnership(
  chunk: { userId: string | null; deletedAt: Date | null },
  userId: string
): { error: string } | null {
  if (chunk.userId !== userId) {
    return { error: 'unauthorized' };
  }
  if (chunk.deletedAt) {
    return { error: 'alreadyDeleted' };
  }
  return null;
}

/** Minimal transaction surface needed to reject pending edit requests. */
type ChunkEditRequestRejectTx = { update: typeof db.update };

/**
 * Auto-reject every still-pending edit request for a chunk. Used by both the
 * publish and delete paths: once a chunk leaves the draft state its
 * `/chunks/[slug]/edit-requests` review page 404s, so pending requests would
 * otherwise strand with no path to resolve. Resolution metadata mirrors the
 * owner-driven reject path so the audit history stays uniform. Intentionally
 * silent — reject does not notify.
 */
export async function autoRejectPendingEditRequests(
  tx: ChunkEditRequestRejectTx,
  chunkId: string,
  resolverId: string,
  resolvedAt: Date
): Promise<void> {
  await tx
    .update(chunkEditRequests)
    .set({ status: 'rejected', resolvedAt, resolverId })
    .where(and(eq(chunkEditRequests.chunkId, chunkId), eq(chunkEditRequests.status, 'pending')));
}
