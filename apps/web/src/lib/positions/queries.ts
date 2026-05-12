import { cache } from 'react';

import { type SQL, and, count, desc, eq, isNull, sql } from 'drizzle-orm';

import { db, positions, profiles } from '@/lib/db';
import { UUID_RE } from '@/lib/validations/uuid';

import type { PositionType } from './types';

type GetPositionByIdOptions = {
  id: string;
  /** Constrain to a specific `positions.type`. Defaults to `'memory'`. */
  type?: PositionType;
  /**
   * When `true`, returns the row even if `deletedAt` is set. Used by the
   * admin detail page so moderators can inspect soft-deleted positions.
   */
  includeDeleted?: boolean;
};

/**
 * Fetch a single position by id.
 *
 * Wrapped with `React.cache` for per-request deduplication so multiple
 * callers (page + generateMetadata + siblings) share a single DB roundtrip.
 */
export const getPositionById = cache(
  async ({ id, type, includeDeleted }: GetPositionByIdOptions) => {
    if (!UUID_RE.test(id)) return null;

    const conditions = [eq(positions.id, id)];
    if (type) conditions.push(eq(positions.type, type));
    if (!includeDeleted) conditions.push(isNull(positions.deletedAt));

    const [row] = await db
      .select()
      .from(positions)
      .where(and(...conditions))
      .limit(1);

    return row ?? null;
  }
);

type ListPositionsOptions = {
  type?: PositionType;
  includeDeleted?: boolean;
  userId?: string;
  limit: number;
  offset: number;
};

function buildListConditions({
  type,
  includeDeleted,
  userId,
}: Pick<ListPositionsOptions, 'type' | 'includeDeleted' | 'userId'>): SQL | undefined {
  const conditions: SQL[] = [];
  if (type) conditions.push(eq(positions.type, type));
  if (!includeDeleted) conditions.push(isNull(positions.deletedAt));
  if (userId) conditions.push(eq(positions.userId, userId));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Fetch a paginated list of positions ordered by `createdAt` DESC.
 */
export async function listPositions({
  type,
  includeDeleted,
  userId,
  limit,
  offset,
}: ListPositionsOptions) {
  const where = buildListConditions({ type, includeDeleted, userId });
  const query = db.select().from(positions);
  const rows = await (where ? query.where(where) : query)
    .orderBy(desc(positions.createdAt))
    .limit(limit)
    .offset(offset);
  return rows;
}

/**
 * Fetch a paginated list of positions joined with author profiles.
 */
export async function listPositionsWithProfile({
  type,
  includeDeleted,
  userId,
  limit,
  offset,
}: ListPositionsOptions) {
  const where = buildListConditions({ type, includeDeleted, userId });
  const query = db
    .select({
      position: positions,
      profile: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(positions)
    .leftJoin(profiles, eq(positions.userId, profiles.id));
  const rows = await (where ? query.where(where) : query)
    .orderBy(desc(positions.createdAt))
    .limit(limit)
    .offset(offset);
  return rows;
}

/**
 * Count positions matching the given filters.
 */
export async function countPositions({
  type,
  includeDeleted,
  userId,
}: Pick<ListPositionsOptions, 'type' | 'includeDeleted' | 'userId'>) {
  const where = buildListConditions({ type, includeDeleted, userId });
  const query = db.select({ value: count() }).from(positions);
  const [row] = await (where ? query.where(where) : query);
  return row?.value ?? 0;
}

/**
 * Fetch a position along with its author profile.
 *
 * Wrapped with `React.cache` so `generateMetadata` and the page component
 * can each call it without hitting the DB twice.
 */
export const getPositionWithProfileById = cache(
  async ({ id, type, includeDeleted }: GetPositionByIdOptions) => {
    if (!UUID_RE.test(id)) return null;

    const conditions = [eq(positions.id, id)];
    if (type) conditions.push(eq(positions.type, type));
    if (!includeDeleted) conditions.push(isNull(positions.deletedAt));

    const [row] = await db
      .select({
        position: positions,
        profile: {
          username: profiles.username,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
      })
      .from(positions)
      .leftJoin(profiles, eq(positions.userId, profiles.id))
      .where(and(...conditions))
      .limit(1);

    return row ?? null;
  }
);
/**
 * Lightweight lookup for fork lineage display on detail pages: returns
 * just enough metadata to render a "Forked from <title>" link, including
 * `deletedAt` so the caller can fall back to a "(deleted)" label when the
 * source has been soft-deleted (the lineage stamp is intentionally
 * orphan-tolerant — see `positions.forkedFromId` schema comment). Returns
 * `null` when the row was hard-deleted or the id never existed.
 *
 * `includeDeleted` is implicit here (we always want to show the parent
 * even if it has been soft-deleted), so the option is omitted.
 */
export const getPositionLineageMetaById = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;

  const [row] = await db
    .select({
      id: positions.id,
      title: positions.title,
      type: positions.type,
      deletedAt: positions.deletedAt,
    })
    .from(positions)
    .where(eq(positions.id, id))
    .limit(1);

  return row ?? null;
});

/**
 * Fetch a single random position of a given type.
 */
export async function getRandomPosition({ type }: { type: PositionType }) {
  const [row] = await db
    .select()
    .from(positions)
    .where(and(eq(positions.type, type), isNull(positions.deletedAt)))
    .orderBy(sql`RANDOM()`)
    .limit(1);

  return row ?? null;
}
