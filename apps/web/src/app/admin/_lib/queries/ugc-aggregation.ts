import { and, count, gte, isNull, lte, sql } from 'drizzle-orm';
import { type PgColumn, type PgTable } from 'drizzle-orm/pg-core';

import { chunks, db, games, positions, repertoires, topicPosts } from '@/lib/db';

import { type DailyCount, fillDateRange } from './aggregate-by-day';

/**
 * UGC source descriptor for dashboard aggregation.
 *
 * Each descriptor points at a table that stores user-generated content and
 * declares the columns needed to (a) bucket records by day, (b) exclude
 * logically-deleted rows, (c) identify distinct posters, and (d) group
 * records by a categorical "kind" column for breakdown reporting.
 *
 * The KPI card, the time-series chart, and the KPI summary table all iterate
 * over `UGC_SOURCES` so that adding a new UGC entity is a one-line change
 * here.
 *
 * If a future UGC table does not use soft-delete, set `deletedAtColumn` to
 * `null` and the aggregation will skip the `IS NULL` filter for that source.
 * If it has no meaningful categorical breakdown, set `breakdownColumn` to
 * `null` and the breakdown reporter will skip that source.
 */
export type UgcSource = {
  /** Stable identifier used as a key in summary responses and i18n lookups. */
  name: 'topic_posts' | 'positions' | 'chunks' | 'games' | 'repertoires';
  table: PgTable;
  createdAtColumn: PgColumn;
  deletedAtColumn: PgColumn | null;
  /**
   * Column holding the posting user's id. May be nullable (e.g. `games`
   * allows account-less authors); `countActivePosters` filters NULLs so an
   * anonymous post does not register as a phantom poster.
   */
  userIdColumn: PgColumn;
  /**
   * Categorical column used for per-source breakdown rows.
   *
   * Prefer giving every source one. `KpiSummaryTable` renders no per-source
   * total — the breakdown rows are a source's ONLY visible presence in the
   * table — so a source with `null` here silently inflates the UGC total with
   * nothing to attribute it to.
   */
  breakdownColumn: PgColumn | null;
};

export const UGC_SOURCES: readonly UgcSource[] = [
  {
    name: 'topic_posts',
    table: topicPosts,
    createdAtColumn: topicPosts.createdAt,
    deletedAtColumn: topicPosts.deletedAt,
    userIdColumn: topicPosts.userId,
    breakdownColumn: topicPosts.topicType,
  },
  {
    name: 'positions',
    table: positions,
    createdAtColumn: positions.createdAt,
    deletedAtColumn: positions.deletedAt,
    userIdColumn: positions.userId,
    breakdownColumn: positions.type,
  },
  {
    name: 'chunks',
    table: chunks,
    createdAtColumn: chunks.createdAt,
    deletedAtColumn: chunks.deletedAt,
    userIdColumn: chunks.userId,
    breakdownColumn: chunks.status,
  },
  {
    // Shared games (公開対局): a published AI-game snapshot. Counting a row =
    // a publish event. `private` is unimplemented, so non-deleted ≈ public; we
    // count all non-deleted games (mirrors chunks counting drafts) rather than
    // filtering on `status`. Broken down by engine_kind (stockfish / maia).
    name: 'games',
    table: games,
    createdAtColumn: games.createdAt,
    deletedAtColumn: games.deletedAt,
    userIdColumn: games.authorId,
    breakdownColumn: games.engineKind,
  },
  {
    // Kata (型): the course row itself. Counted from creation, not publication
    // — the breakdown on `status` is what separates the workshop from the
    // catalogue (`building` = the owner's draft; the other three are the
    // visibility tiers). This mirrors chunks counting drafts and games counting
    // every non-deleted row: the dashboard measures authoring activity, and a
    // course written today but published next month is activity today.
    // `created_at` (not `published_at`) is therefore the right bucket column.
    name: 'repertoires',
    table: repertoires,
    createdAtColumn: repertoires.createdAt,
    deletedAtColumn: repertoires.deletedAt,
    userIdColumn: repertoires.userId,
    breakdownColumn: repertoires.status,
  },
];

/**
 * Aggregate a single UGC source per day using Drizzle ORM.
 *
 * Excludes soft-deleted rows when the source declares a `deletedAtColumn`.
 * The per-day bucketing uses `DATE(... AT TIME ZONE 'UTC')`, matching the
 * existing convention used elsewhere on the dashboard.
 */
async function getUgcSourceCountsByDate(
  source: UgcSource,
  start: Date,
  end: Date
): Promise<Map<string, number>> {
  const { table, createdAtColumn, deletedAtColumn } = source;

  const dateExpr = sql<string>`DATE(${createdAtColumn} AT TIME ZONE 'UTC')`;

  const conditions = [gte(createdAtColumn, start), lte(createdAtColumn, end)];
  if (deletedAtColumn) {
    conditions.push(isNull(deletedAtColumn));
  }

  const rows = await db
    .select({
      date: dateExpr.as('date'),
      count: count(),
    })
    .from(table)
    .where(and(...conditions))
    .groupBy(dateExpr)
    .orderBy(dateExpr);

  const countsByDate = new Map<string, number>();
  for (const row of rows) {
    countsByDate.set(row.date, row.count);
  }
  return countsByDate;
}

/**
 * Aggregate UGC posts per day across all configured UGC sources.
 *
 * Sums contributions from every entry in `UGC_SOURCES` into a single combined
 * series. Soft-deleted rows are excluded. To add a new UGC entity, append it
 * to `UGC_SOURCES` — no changes are needed here.
 */
export async function getPostsPerDay(
  startDate: string,
  endDate: string
): Promise<{ daily: DailyCount[]; total: number }> {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  const perSource = await Promise.all(
    UGC_SOURCES.map((source) => getUgcSourceCountsByDate(source, start, end))
  );

  const combined = new Map<string, number>();
  for (const countsByDate of perSource) {
    for (const [date, c] of countsByDate) {
      combined.set(date, (combined.get(date) ?? 0) + c);
    }
  }

  const daily = fillDateRange(startDate, endDate, combined);
  const total = daily.reduce((sum, d) => sum + d.count, 0);

  return { daily, total };
}
