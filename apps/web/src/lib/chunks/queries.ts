import { cache } from 'react';

import { type SQL, and, count, desc, eq, isNull } from 'drizzle-orm';

import { chunks, db } from '@/lib/db';
import { UUID_RE } from '@/lib/validations/uuid';

type GetChunkByIdOptions = {
  id: string;
  /**
   * When `true`, returns the row even if `deletedAt` is set. Used by the
   * admin detail / edit pages so moderators can inspect soft-deleted chunks.
   */
  includeDeleted?: boolean;
};

/**
 * Fetch a single chunk by id.
 *
 * Wrapped with `React.cache` for per-request deduplication so multiple
 * callers (page + generateMetadata + siblings) share a single DB roundtrip.
 */
export const getChunkById = cache(async ({ id, includeDeleted }: GetChunkByIdOptions) => {
  if (!UUID_RE.test(id)) return null;

  const conditions = [eq(chunks.id, id)];
  if (!includeDeleted) conditions.push(isNull(chunks.deletedAt));

  const [row] = await db
    .select()
    .from(chunks)
    .where(and(...conditions))
    .limit(1);

  return row ?? null;
});

type ListChunksOptions = {
  includeDeleted?: boolean;
  limit: number;
  offset: number;
};

function buildListConditions({
  includeDeleted,
}: Pick<ListChunksOptions, 'includeDeleted'>): SQL | undefined {
  const conditions: SQL[] = [];
  if (!includeDeleted) conditions.push(isNull(chunks.deletedAt));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Fetch a paginated list of chunks ordered by `createdAt` DESC.
 */
export async function listChunks({ includeDeleted, limit, offset }: ListChunksOptions) {
  const where = buildListConditions({ includeDeleted });
  const query = db.select().from(chunks);
  const rows = await (where ? query.where(where) : query)
    .orderBy(desc(chunks.createdAt))
    .limit(limit)
    .offset(offset);
  return rows;
}

/**
 * Count chunks matching the given filters.
 */
export async function countChunks({ includeDeleted }: Pick<ListChunksOptions, 'includeDeleted'>) {
  const where = buildListConditions({ includeDeleted });
  const query = db.select({ value: count() }).from(chunks);
  const [row] = await (where ? query.where(where) : query);
  return row?.value ?? 0;
}
