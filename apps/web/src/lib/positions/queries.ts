import { cache } from 'react';

import { type SQL, and, count, desc, eq, isNull } from 'drizzle-orm';

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
  limit: number;
  offset: number;
};

function buildListConditions({
  type,
  includeDeleted,
}: Pick<ListPositionsOptions, 'type' | 'includeDeleted'>): SQL | undefined {
  const conditions: SQL[] = [];
  if (type) conditions.push(eq(positions.type, type));
  if (!includeDeleted) conditions.push(isNull(positions.deletedAt));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Fetch a paginated list of positions ordered by `createdAt` DESC.
 */
export async function listPositions({ type, includeDeleted, limit, offset }: ListPositionsOptions) {
  const where = buildListConditions({ type, includeDeleted });
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
  limit,
  offset,
}: ListPositionsOptions) {
  const where = buildListConditions({ type, includeDeleted });
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
}: Pick<ListPositionsOptions, 'type' | 'includeDeleted'>) {
  const where = buildListConditions({ type, includeDeleted });
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
