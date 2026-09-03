import { cache } from 'react';

import { unstable_cache } from 'next/cache';

import { type SQL, and, desc, eq, isNull, sql } from 'drizzle-orm';

import { DAILY_PUZZLE_CACHE_TAG } from '@/lib/cache-tags';
import {
  AUTHOR_PROFILE_COLUMNS,
  db,
  featuredPuzzles,
  likes,
  liveProfileJoinOn,
  positions,
  profiles,
  topicPosts,
} from '@/lib/db';
import { combineConditions, countRows, runPaginatedSelect } from '@/lib/db/list-query';
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
 * Shared `WHERE` conditions for the by-id lookups (`getPositionById`,
 * `getPositionWithProfileById`), so the two stay in lockstep on the
 * type / soft-delete filtering rules.
 */
function buildByIdConditions({ id, type, includeDeleted }: GetPositionByIdOptions): SQL[] {
  const conditions: SQL[] = [eq(positions.id, id)];
  if (type) conditions.push(eq(positions.type, type));
  if (!includeDeleted) conditions.push(isNull(positions.deletedAt));
  return conditions;
}

/**
 * Fetch a single position by id.
 *
 * Wrapped with `React.cache` for per-request deduplication so multiple
 * callers (page + generateMetadata + siblings) share a single DB roundtrip.
 */
export const getPositionById = cache(async (options: GetPositionByIdOptions) => {
  if (!UUID_RE.test(options.id)) return null;

  const [row] = await db
    .select()
    .from(positions)
    .where(and(...buildByIdConditions(options)))
    .limit(1);

  return row ?? null;
});

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
  SQL | undefined {
  const conditions: SQL[] = [];
  if (type) conditions.push(eq(positions.type, type));
  if (!includeDeleted) conditions.push(isNull(positions.deletedAt));
  if (userId) conditions.push(eq(positions.userId, userId));
  if (forkedFromId) conditions.push(eq(positions.forkedFromId, forkedFromId));
  return combineConditions(conditions);
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
  return runPaginatedSelect(db.select().from(positions).$dynamic(), {
    where,
    orderBy: [desc(positions.createdAt)],
    limit,
    offset,
  });
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
    .leftJoin(profiles, liveProfileJoinOn(positions.userId))
    .$dynamic();
  return runPaginatedSelect(query, {
    where,
    orderBy: buildPositionOrderBy(sort, topicType),
    limit,
    offset,
  });
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
export const getPositionWithProfileById = cache(async (options: GetPositionByIdOptions) => {
  if (!UUID_RE.test(options.id)) return null;

  const [row] = await db
    .select({
      position: positions,
      profile: AUTHOR_PROFILE_COLUMNS,
    })
    .from(positions)
    .leftJoin(profiles, liveProfileJoinOn(positions.userId))
    .where(and(...buildByIdConditions(options)))
    .limit(1);

  return row ?? null;
});
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

/** The current UTC day, as `YYYY-MM-DD`. Used as the daily-puzzle seed. */
export function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Pick the day's puzzle from the admin-curated `featured_puzzles` pool.
 *
 * `md5(dayKey || id)` is a stable pseudo-random shuffle: within a day every
 * caller sees the same row, and the row changes when the day does. This is
 * what makes the "Daily Puzzle" card actually daily — an unseeded
 * `ORDER BY RANDOM()` (what this used to be) handed out a different puzzle on
 * every reload, so a user could never come back to "today's" puzzle. The hash
 * has no memory, so a small pool can repeat a puzzle on consecutive days —
 * accepted; keep a few puzzles featured.
 *
 * Selection is restricted to pool members (not all puzzles): the pool is UGC
 * that an admin has explicitly vouched for, since this card is effectively an
 * editorial recommendation on the two most prominent signed-in surfaces. The
 * `type` / `deletedAt` filters re-check what the admin toggle already
 * enforces, so a soft-deleted pool member drops out on its own.
 *
 * `unstable_cache` bounds the query to once an hour per day key; the day key
 * pins the *result*. Admin pool changes and puzzle deletes revalidate
 * {@link DAILY_PUZZLE_CACHE_TAG} for an immediate swap, so the hourly
 * revalidate is only a backstop for un-tagged writes (e.g. an owner deleting
 * their own featured puzzle from the public side).
 *
 * Do not lengthen the hour to match the rest of the app's data caches. A
 * prerendered page that renders the card — `/[locale]/practice` — takes this
 * interval as its own ISR floor, and rolling the day forward picks a new
 * cache key here without touching the route cache holding that page's HTML.
 * The interval is therefore what actually swaps the card over on a static
 * page; at a week it would show last week's puzzle. `/practice` reading `1h`
 * in the build's route table is this, and is correct.
 */
const selectDailyPuzzle = unstable_cache(
  async (dayKey: string) => {
    const [row] = await db
      .select({ position: positions })
      .from(featuredPuzzles)
      .innerJoin(positions, eq(positions.id, featuredPuzzles.positionId))
      .where(and(eq(positions.type, 'puzzle'), isNull(positions.deletedAt)))
      .orderBy(sql`md5(${dayKey} || ${positions.id}::text)`)
      .limit(1);

    return row?.position ?? null;
  },
  ['daily-puzzle'],
  { tags: [DAILY_PUZZLE_CACHE_TAG], revalidate: 3600 }
);

/**
 * Fetch the puzzle of the day (see {@link selectDailyPuzzle}). Returns `null`
 * when the featured pool is empty — callers hide the Daily Puzzle UI.
 */
export async function getDailyPuzzle() {
  return selectDailyPuzzle(utcDayKey());
}

/**
 * All position ids currently in the Daily Puzzle pool. Admin-only consumer
 * (the puzzle list page marks featured rows); the pool is expected to stay
 * small, so this is an unpaginated full read.
 */
export async function listFeaturedPuzzleIds(): Promise<Set<string>> {
  const rows = await db.select({ id: featuredPuzzles.positionId }).from(featuredPuzzles);
  return new Set(rows.map((r) => r.id));
}
