import { cache } from 'react';

import { type SQL, and, count, desc, eq, isNull } from 'drizzle-orm';

import { chunks, db, positionChunks, positions } from '@/lib/db';
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

/**
 * Fetch a single chunk by slug. Only returns non-deleted rows (public use).
 *
 * Wrapped with `React.cache` for per-request deduplication.
 */
export const getChunkBySlug = cache(async (slug: string) => {
  if (!slug) return null;

  const [row] = await db
    .select()
    .from(chunks)
    .where(and(eq(chunks.slug, slug), isNull(chunks.deletedAt)))
    .limit(1);

  return row ?? null;
});

/**
 * Fetch positions linked to a chunk via the position_chunks junction table.
 * Only returns non-deleted positions, ordered by creation date descending.
 *
 * @design position_chunks rows are intentionally preserved when a chunk is
 * soft-deleted. Because chunks use logical deletion (`deletedAt`), the
 * junction rows remain so that restoring the chunk also restores its
 * position associations without data loss. Callers that display chunk data
 * on public pages should filter out soft-deleted chunks at the chunk query
 * level (e.g. `getChunkBySlug` already enforces `deletedAt IS NULL`),
 * which prevents the linked positions from surfacing indirectly.
 */
/**
 * Fetch chunks linked to a position via the position_chunks junction table.
 * Only returns non-deleted chunks, ordered by chunk title ascending.
 * Used on position detail pages to show related patterns.
 */
export async function getLinkedChunksForPosition(positionId: string) {
  const rows = await db
    .select({
      id: chunks.id,
      slug: chunks.slug,
      title: chunks.title,
      description: chunks.description,
      representativeFen: chunks.representativeFen,
    })
    .from(positionChunks)
    .innerJoin(chunks, eq(positionChunks.chunkId, chunks.id))
    .where(and(eq(positionChunks.positionId, positionId), isNull(chunks.deletedAt)))
    .orderBy(chunks.title);

  return rows;
}

export async function getLinkedPositionsForChunk(chunkId: string) {
  const rows = await db
    .select({
      id: positions.id,
      title: positions.title,
      fen: positions.fen,
      type: positions.type,
    })
    .from(positionChunks)
    .innerJoin(positions, eq(positionChunks.positionId, positions.id))
    .where(and(eq(positionChunks.chunkId, chunkId), isNull(positions.deletedAt)))
    .orderBy(desc(positions.createdAt));

  return rows;
}
