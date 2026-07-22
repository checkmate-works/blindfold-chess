import { cache } from 'react';

import { eq } from 'drizzle-orm';

import { db, positionChunks, positionEditRequests, positionThemes } from '@/lib/db';
import { makeEditRequestQueries } from '@/lib/edit-requests/queries-factory';
import { UUID_RE } from '@/lib/validations/uuid';

const queries = makeEditRequestQueries({
  table: positionEditRequests,
  parentIdColumn: positionEditRequests.positionId,
});

/** See {@link makeEditRequestQueries} for the shared read-side semantics. */
export const listEditRequestsForPosition = queries.listForParent;
export const countPendingEditRequestsForPosition = queries.countPendingForParent;
export const countEditRequestsForPosition = queries.countForParent;
export const getPositionEditRequestById = queries.getById;
export const getViewerPendingEditRequestForPosition = queries.getViewerPendingForParent;

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

/**
 * The current set of glossary-term (theme) IDs linked to a position.
 * Theme counterpart of {@link getLinkedChunkIdsForPosition}; used for the
 * same submit-time no-op check. IDs only — the label-bearing variant is
 * `getLinkedThemesForPosition` in `@/lib/themes/queries`, which also joins
 * translations and example positions.
 */
export const getLinkedThemeIdsForPosition = cache(async (positionId: string): Promise<string[]> => {
  if (!UUID_RE.test(positionId)) return [];
  const rows = await db
    .select({ termId: positionThemes.termId })
    .from(positionThemes)
    .where(eq(positionThemes.positionId, positionId));
  return rows.map((row) => row.termId);
});
