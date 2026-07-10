import { and, eq } from 'drizzle-orm';

import { chunkEditRequests, chunks, db } from '@/lib/db';
import { guardOwnership } from '@/lib/ownership-guard';

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
  const error = guardOwnership(chunk, userId);
  return error ? { error } : null;
}

/**
 * Columns fetched for every owner-scoped chunk mutation — a single superset
 * shape rather than per-mutation column lists. `title` / `description` /
 * `representativeFen` are the pre-update values the update path diffs into
 * the activity log (chunks keep no revision history); publish reads
 * `description` for its non-empty requirement; the rest feed the shared
 * not-found / ownership / soft-delete checks. Fetching the superset
 * unconditionally costs a few extra columns on a single-row read and keeps
 * the loader monomorphic.
 */
const ownedChunkColumns = {
  id: chunks.id,
  userId: chunks.userId,
  slug: chunks.slug,
  status: chunks.status,
  deletedAt: chunks.deletedAt,
  title: chunks.title,
  description: chunks.description,
  representativeFen: chunks.representativeFen,
};

function selectChunkById(id: string) {
  return db.select(ownedChunkColumns).from(chunks).where(eq(chunks.id, id)).limit(1);
}

/** Row shape returned by {@link loadOwnedChunk} on success. */
export type OwnedChunk = Awaited<ReturnType<typeof selectChunkById>>[number];

/**
 * Shared preamble of the update / publish / delete chunk mutations: load the
 * row by id, then reject with `notFound` when it doesn't exist or with the
 * ownership / soft-delete errors from `guardChunkOwnership`. Callers are
 * still responsible for their own empty-id short-circuit (it sits at a
 * different point in each mutation's guard → validate ordering).
 */
export async function loadOwnedChunk(
  id: string,
  userId: string
): Promise<{ chunk: OwnedChunk } | { error: string }> {
  const [chunk] = await selectChunkById(id);

  if (!chunk) {
    return { error: 'notFound' };
  }
  const ownershipError = guardChunkOwnership(chunk, userId);
  if (ownershipError) {
    return ownershipError;
  }
  return { chunk };
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
