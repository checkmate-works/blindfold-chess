'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { and, eq, ilike, isNull, notInArray } from 'drizzle-orm';

import { db, positionChunks, positions } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function linkPositionToChunk(
  chunkId: string,
  positionId: string
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  if (!isValidUuid(chunkId) || !isValidUuid(positionId)) {
    return { error: 'Invalid UUID format' };
  }

  await db.insert(positionChunks).values({ chunkId, positionId }).onConflictDoNothing();

  revalidatePath(`/admin/chunks/${chunkId}/edit`);
  return { success: true };
}

export async function unlinkPositionFromChunk(
  chunkId: string,
  positionId: string
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  if (!isValidUuid(chunkId) || !isValidUuid(positionId)) {
    return { error: 'Invalid UUID format' };
  }

  await db
    .delete(positionChunks)
    .where(and(eq(positionChunks.chunkId, chunkId), eq(positionChunks.positionId, positionId)));

  revalidatePath(`/admin/chunks/${chunkId}/edit`);
  return { success: true };
}

export type PositionSearchResult = {
  id: string;
  title: string;
  fen: string;
  type: string;
};

export async function searchPositions(
  query: string,
  excludeIds: string[]
): Promise<PositionSearchResult[]> {
  const auth = await requireAdmin();
  if ('error' in auth) return [];

  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const conditions = [isNull(positions.deletedAt), ilike(positions.title, `%${trimmed}%`)];

  if (excludeIds.length > 0) {
    conditions.push(notInArray(positions.id, excludeIds));
  }

  const results = await db
    .select({
      id: positions.id,
      title: positions.title,
      fen: positions.fen,
      type: positions.type,
    })
    .from(positions)
    .where(and(...conditions))
    .limit(20);

  return results;
}

export async function getLinkedPositions(
  chunkId: string
): Promise<{ id: string; title: string; fen: string; type: string }[]> {
  const auth = await requireAdmin();
  if ('error' in auth) return [];

  if (!isValidUuid(chunkId)) return [];

  const rows = await db
    .select({
      id: positions.id,
      title: positions.title,
      fen: positions.fen,
      type: positions.type,
    })
    .from(positionChunks)
    .innerJoin(positions, eq(positionChunks.positionId, positions.id))
    .where(and(eq(positionChunks.chunkId, chunkId), isNull(positions.deletedAt)));

  return rows;
}
