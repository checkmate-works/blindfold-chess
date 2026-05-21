import { cache } from 'react';

import { type SQL, and, asc, count, desc, eq, isNull } from 'drizzle-orm';

import { chunks, db, positionChunks, positions, profiles } from '@/lib/db';
import { UUID_RE } from '@/lib/validations/uuid';

import type { ChunkOption } from './types';

// Shared select column list for the picker-facing chunk queries.
// Centralized so the per-position and the global catalog loaders stay
// in lock-step — adding a chunk column shows up in one place.
const chunkOptionSelectColumns = {
  id: chunks.id,
  slug: chunks.slug,
  title: chunks.title,
  representativeFen: chunks.representativeFen,
  description: chunks.description,
} as const;

type ChunkOptionRow = {
  id: string;
  slug: string;
  title: string;
  representativeFen: string;
  description: string | null;
};

function mapChunkOption(row: ChunkOptionRow): ChunkOption {
  return {
    id: row.id,
    slug: row.slug,
    label: row.title,
    representativeFen: row.representativeFen,
    description: row.description ?? null,
  };
}

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
 * Fetch a paginated list of chunks joined with author profiles. Used by
 * the public catalog list page when the cards need an author avatar.
 *
 * `userId` is nullable on `chunks` (orphaned-author rows survive hard
 * account deletes), and the join is `LEFT` so those rows still surface
 * with a null profile.
 */
export async function listChunksWithProfile({ includeDeleted, limit, offset }: ListChunksOptions) {
  const where = buildListConditions({ includeDeleted });
  const query = db
    .select({
      chunk: chunks,
      profile: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(chunks)
    .leftJoin(profiles, eq(chunks.userId, profiles.id));
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
 * Slug-collision preflight for the chunk create flow. Returns minimal
 * metadata for any chunk matching `slug` regardless of `deletedAt` —
 * the DB-level UNIQUE constraint on `chunks.slug` does NOT exclude
 * soft-deleted rows, so a slug remains reserved after a logical delete.
 * Resurrecting via the same slug requires a service-role restore, not a
 * fresh INSERT.
 *
 * The check is a UX preflight only; the canonical guarantee is the unique
 * constraint, and the mutation layer also catches PG error code 23505 to
 * cover the race window between preflight and INSERT.
 */
export const findChunkBySlug = cache(async (slug: string) => {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const [row] = await db
    .select({
      id: chunks.id,
      slug: chunks.slug,
      deletedAt: chunks.deletedAt,
    })
    .from(chunks)
    .where(eq(chunks.slug, trimmed))
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

/**
 * Picker-facing variant of `getLinkedChunksForPosition` that returns
 * the `ChunkOption` shape (with `label` instead of raw `title`). Used
 * by the puzzle editor when hydrating already-attached chunks; the
 * detail-page-facing `getLinkedChunksForPosition` stays available
 * unchanged for read-side consumers.
 */
export const getLinkedChunkOptionsForPosition = cache(
  async (positionId: string): Promise<ChunkOption[]> => {
    const rows = await db
      .select(chunkOptionSelectColumns)
      .from(positionChunks)
      .innerJoin(chunks, eq(chunks.id, positionChunks.chunkId))
      .where(and(eq(positionChunks.positionId, positionId), isNull(chunks.deletedAt)))
      .orderBy(asc(chunks.title));
    return rows.map(mapChunkOption);
  }
);

/**
 * Load every non-deleted chunk for the picker catalog. Chunks are UGC
 * and may grow large enough to need server-side search — when that
 * happens, swap this for a debounced search action without changing
 * the return type.
 */
export const getAllAvailableChunkOptions = cache(async (): Promise<ChunkOption[]> => {
  const rows = await db
    .select(chunkOptionSelectColumns)
    .from(chunks)
    .where(isNull(chunks.deletedAt))
    .orderBy(asc(chunks.title));
  return rows.map(mapChunkOption);
});

/**
 * Linked positions for the chunk detail page.
 *
 * Returns the full Position row plus the author profile fields needed by the
 * shared `PositionListCard` so the chunk page can render the same card UI as
 * `/practice/puzzle` and `/practice/position-memory`. Soft-deleted positions
 * are excluded; profile join is `LEFT` so a deleted-author position still
 * surfaces with a null profile (matches `listPositionsWithProfile`).
 */
export async function getLinkedPositionsForChunk(chunkId: string) {
  const rows = await db
    .select({
      position: positions,
      profile: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(positionChunks)
    .innerJoin(positions, eq(positionChunks.positionId, positions.id))
    .leftJoin(profiles, eq(positions.userId, profiles.id))
    .where(and(eq(positionChunks.chunkId, chunkId), isNull(positions.deletedAt)))
    .orderBy(desc(positions.createdAt));

  return rows;
}
