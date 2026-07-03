import { cache } from 'react';

import { type SQL, and, desc, eq, isNull, sql } from 'drizzle-orm';

import {
  AUTHOR_PROFILE_COLUMNS,
  db,
  likes,
  liveProfileJoinOn,
  positions,
  profiles,
  topicPosts,
} from '@/lib/db';
import { countRows } from '@/lib/db/list-query';
import { UUID_RE } from '@/lib/validations/uuid';

import type { PositionSortMode, PositionType } from './types';

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
  /**
   * Restrict to rows whose `forked_from_id` matches the given uuid. Used by
   * detail pages to render the "Forks (N)" descendant list on a parent
   * position. UUID validation is done at the SQL boundary by the existing
   * `eq` parameterization, so callers can pass a uuid string directly.
   */
  forkedFromId?: string;
  /**
   * List ordering. Defaults to `'new'` (`createdAt` DESC). `'popular'` and
   * `'active'` push the ordering down to the DB via correlated subqueries so
   * it is applied across the whole result set before `limit`/`offset` — they
   * cannot be done by sorting a single fetched page in memory.
   */
  sort?: PositionSortMode;
  limit: number;
  offset: number;
};

/**
 * Build the `ORDER BY` expressions for a position list.
 *
 * `popular` / `active` use correlated subqueries against the polymorphic
 * `likes` / `topic_posts` tables (the like count and latest-comment timestamp
 * are not columns on `positions`). `createdAt` DESC is always the final tie
 * breaker so ordering is deterministic.
 *
 * `active` ordering requires `topicType` (derived from the position `type`,
 * e.g. `puzzle` → `position_puzzle`); without it there is no thread to rank
 * by, so it falls back to `new`.
 */
function buildPositionOrderBy(sort: PositionSortMode, topicType: string | undefined): SQL[] {
  if (sort === 'popular') {
    const likeCount = sql<number>`(
      select count(*) from ${likes}
      where ${likes.targetType} = 'position' and ${likes.targetId} = ${positions.id}
    )`;
    return [desc(likeCount), desc(positions.createdAt)];
  }

  if (sort === 'active' && topicType) {
    const latestReplyAt = sql`(
      select max(${topicPosts.createdAt}) from ${topicPosts}
      where ${topicPosts.topicType} = ${topicType}
        and ${topicPosts.topicKey} = ${positions.id}::text
        and ${topicPosts.deletedAt} is null
    )`;
    return [sql`${latestReplyAt} desc nulls last`, desc(positions.createdAt)];
  }

  return [desc(positions.createdAt)];
}

function buildListConditions({
  type,
  includeDeleted,
  userId,
  forkedFromId,
}: Pick<ListPositionsOptions, 'type' | 'includeDeleted' | 'userId' | 'forkedFromId'>):
  | SQL
  | undefined {
  const conditions: SQL[] = [];
  if (type) conditions.push(eq(positions.type, type));
  if (!includeDeleted) conditions.push(isNull(positions.deletedAt));
  if (userId) conditions.push(eq(positions.userId, userId));
  if (forkedFromId) conditions.push(eq(positions.forkedFromId, forkedFromId));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Fetch a paginated list of positions ordered by `createdAt` DESC.
 */
export async function listPositions({
  type,
  includeDeleted,
  userId,
  forkedFromId,
  limit,
  offset,
}: ListPositionsOptions) {
  const where = buildListConditions({ type, includeDeleted, userId, forkedFromId });
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
  forkedFromId,
  sort = 'new',
  limit,
  offset,
}: ListPositionsOptions) {
  const where = buildListConditions({ type, includeDeleted, userId, forkedFromId });
  const topicType = type ? `position_${type}` : undefined;
  const query = db
    .select({
      position: positions,
      profile: AUTHOR_PROFILE_COLUMNS,
    })
    .from(positions)
    .leftJoin(profiles, liveProfileJoinOn(positions.userId));
  const rows = await (where ? query.where(where) : query)
    .orderBy(...buildPositionOrderBy(sort, topicType))
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
  forkedFromId,
}: Pick<ListPositionsOptions, 'type' | 'includeDeleted' | 'userId' | 'forkedFromId'>) {
  return countRows(positions, buildListConditions({ type, includeDeleted, userId, forkedFromId }));
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
        profile: AUTHOR_PROFILE_COLUMNS,
      })
      .from(positions)
      .leftJoin(profiles, liveProfileJoinOn(positions.userId))
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
