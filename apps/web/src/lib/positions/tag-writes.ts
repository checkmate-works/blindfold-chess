import { eq } from 'drizzle-orm';

import { positionChunks, positionThemes } from '@/lib/db';
import type { DbTxOrDb } from '@/lib/db/types';

/**
 * Insert junction rows for theme/chunk tags on a newly created
 * position. Used by `createPuzzle` inside the create transaction —
 * skips both kinds when the corresponding array is undefined or empty.
 */
export async function insertPositionTags(
  tx: DbTxOrDb,
  positionId: string,
  attachedByUserId: string,
  themeIds: string[] | undefined,
  chunkIds: string[] | undefined
): Promise<void> {
  if (themeIds && themeIds.length > 0) {
    await tx
      .insert(positionThemes)
      .values(themeIds.map((termId) => ({ positionId, termId, attachedByUserId })));
  }
  if (chunkIds && chunkIds.length > 0) {
    await tx
      .insert(positionChunks)
      .values(chunkIds.map((chunkId) => ({ positionId, chunkId, attachedByUserId })));
  }
}

/**
 * Replace junction rows for a position wholesale. Used by
 * `updatePuzzle` inside the update transaction. `undefined` for either
 * array means "leave existing tags untouched"; explicit `[]` means
 * "remove all". This asymmetry mirrors the action's contract where
 * omitting a field preserves it.
 */
export async function replacePositionTags(
  tx: DbTxOrDb,
  positionId: string,
  attachedByUserId: string,
  themeIds: string[] | undefined,
  chunkIds: string[] | undefined
): Promise<void> {
  if (themeIds !== undefined) {
    await tx.delete(positionThemes).where(eq(positionThemes.positionId, positionId));
    if (themeIds.length > 0) {
      await tx
        .insert(positionThemes)
        .values(themeIds.map((termId) => ({ positionId, termId, attachedByUserId })));
    }
  }
  if (chunkIds !== undefined) {
    await tx.delete(positionChunks).where(eq(positionChunks.positionId, positionId));
    if (chunkIds.length > 0) {
      await tx
        .insert(positionChunks)
        .values(chunkIds.map((chunkId) => ({ positionId, chunkId, attachedByUserId })));
    }
  }
}
