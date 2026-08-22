import { type SQL, desc, eq, gt, lt } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';
import { combineConditions, countRows } from '@/lib/db/list-query';

import {
  ADMIN_GRANT_SOURCE,
  AI_REVIEW_REFUND_SOURCE,
  AI_REVIEW_SOURCE,
  LIKE_GRANT_SOURCE,
  MAIA_GAME_SOURCE,
  POINT_SOURCES,
  PURCHASE_SOURCE,
  type PointCategory,
  REDEMPTION_SOURCE,
} from './constants';
import { type PointHistoryEntry, classifyKind } from './get-history';

/**
 * Every `point_events.source` value the `/admin/coins` source filter offers,
 * in display order: the non-UGC flows first (admin grant, like batch, the two
 * spend paths, purchase), then the UGC-creation sources. Single source of
 * truth for both the filter dropdown options and the page's input validation
 * (an unknown `source` query param is ignored rather than yielding an empty
 * table).
 */
export const POINT_EVENT_SOURCE_OPTIONS = [
  ADMIN_GRANT_SOURCE,
  LIKE_GRANT_SOURCE,
  REDEMPTION_SOURCE,
  MAIA_GAME_SOURCE,
  AI_REVIEW_SOURCE,
  AI_REVIEW_REFUND_SOURCE,
  PURCHASE_SOURCE,
  ...POINT_SOURCES,
] as const;

/**
 * Cross-user filters for the `/admin/coins` ledger view. Every field is
 * optional; omitting a field widens the result set. This is the admin-side
 * read surface over `point_events` (the coin ledger) — the counterpart to the
 * per-user `getPointHistory`. See the "Points / Coin Economy" note in
 * apps/web/CLAUDE.md for why the ledger stays "points" while the UI says
 * "Coin".
 */
export type PointEventFilters = {
  /** Exact match on `point_events.source` (e.g. 'admin_grant', 'maia_game'). */
  source?: string;
  /** Exact match on `point_events.category`. */
  category?: PointCategory;
  /** Exact match on the recipient/spender. */
  userId?: string;
  /** `'grant'` keeps positive deltas, `'spend'` keeps negative deltas. */
  direction?: 'grant' | 'spend';
};

/** One ledger row as rendered in the `/admin/coins` transactions table. */
export type PointEventRow = {
  id: string;
  userId: string;
  delta: number;
  category: PointCategory | string;
  source: string;
  sourceId: string | null;
  /** Moderator memo / context from `metadata.reason`, when present. */
  reason: string | null;
  createdAt: Date;
  /** Same discriminator `getPointHistory` exposes, for shared kind labels. */
  kind: PointHistoryEntry['kind'];
};

/**
 * Translate the public filter shape into a single `WHERE` predicate. Returns
 * `undefined` when no filter is active so the caller selects every row.
 */
function buildWhere(filters: PointEventFilters): SQL | undefined {
  const conditions: SQL[] = [];
  if (filters.source) conditions.push(eq(pointEvents.source, filters.source));
  if (filters.category) conditions.push(eq(pointEvents.category, filters.category));
  if (filters.userId) conditions.push(eq(pointEvents.userId, filters.userId));
  if (filters.direction === 'grant') conditions.push(gt(pointEvents.delta, 0));
  if (filters.direction === 'spend') conditions.push(lt(pointEvents.delta, 0));
  return combineConditions(conditions);
}

/** Count ledger rows matching `filters` — drives `/admin/coins` pagination. */
export async function countPointEvents(filters: PointEventFilters = {}): Promise<number> {
  return countRows(pointEvents, buildWhere(filters));
}

/**
 * List ledger rows across all users, newest first, paginated. Keeps the
 * `point_events` schema encapsulated within `@/lib/points`; the admin page
 * renders the returned rows without reaching into the table itself.
 */
export async function listPointEvents(
  filters: PointEventFilters,
  limit: number,
  offset: number
): Promise<PointEventRow[]> {
  const rows = await db
    .select({
      id: pointEvents.id,
      userId: pointEvents.userId,
      delta: pointEvents.delta,
      category: pointEvents.category,
      source: pointEvents.source,
      sourceId: pointEvents.sourceId,
      metadata: pointEvents.metadata,
      createdAt: pointEvents.createdAt,
    })
    .from(pointEvents)
    .where(buildWhere(filters))
    .orderBy(desc(pointEvents.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    delta: r.delta,
    category: r.category,
    source: r.source,
    sourceId: r.sourceId,
    reason: (r.metadata as { reason?: string | null } | null)?.reason ?? null,
    createdAt: r.createdAt,
    kind: classifyKind(r.source, r.delta, r.metadata),
  }));
}
