import { eq } from 'drizzle-orm';

import { positionChunks, positionThemes } from '@/lib/db';
import type { DbTxOrDb } from '@/lib/db/types';

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
 * `undefined` for either array means "leave existing tags untouched";
 * explicit `[]` means "remove all". Asymmetric on purpose so callers
 * can distinguish "field omitted" from "explicit empty replacement".
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
