import { type SQL, and, count, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { type PgColumn, type PgTable } from 'drizzle-orm/pg-core';

import { chunks, db, games, positions, repertoireLines, repertoires, topicPosts } from '@/lib/db';

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
  name: 'topic_posts' | 'positions' | 'chunks' | 'games' | 'repertoires' | 'repertoire_lines';
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
  /** Owning table to inner-join; omit for sources that stand alone. */
  parentJoin?: UgcParentJoin;
};

/**
 * Owning table joined into every aggregation of a child source.
 *
 * Needed when the child row's own columns do not carry the whole truth. Only
 * `repertoire_lines` needs it today: a line has no author column, and its
 * liveness depends on its course — `deleteRepertoireEntry` stamps
 * `repertoires.deleted_at` and leaves the line rows' `deleted_at` NULL, because
 * lines "cascade-hide behind the parent" at the read path. Filtering on the
 * child's own `deleted_at` alone would therefore keep counting a deleted
 * course's lines forever.
 *
 * The join is applied by all three aggregations (per-day counts, breakdown,
 * active posters), so `userIdColumn` / `breakdownColumn` may name a column on
 * this table rather than on `table`.
 */
export type UgcParentJoin = {
  table: PgTable;
  /** Join predicate, e.g. `eq(repertoireLines.repertoireId, repertoires.id)`. */
  on: SQL;
  /** Parent's soft-delete column; `IS NULL` is added to every query. */
  deletedAtColumn: PgColumn | null;
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
  {
    // The lines (variations) of a kata — the actual authoring volume. A course
    // row is one click; its lines are the work, and a 50-line course is not
    // comparable to a one-line one, so both layers are counted (a 50-line
    // course contributes 51). Attributed to the owner and grouped by the
    // PARENT's status, both of which live on `repertoires` — see `parentJoin`
    // for why that join is also what keeps a deleted course's lines out.
    name: 'repertoire_lines',
    table: repertoireLines,
    createdAtColumn: repertoireLines.createdAt,
    deletedAtColumn: repertoireLines.deletedAt,
    userIdColumn: repertoires.userId,
    breakdownColumn: repertoires.status,
    parentJoin: {
      table: repertoires,
      on: eq(repertoireLines.repertoireId, repertoires.id),
      deletedAtColumn: repertoires.deletedAt,
    },
  },
];

/**
 * The predicate every aggregation of a source shares: the period window, the
 * source's own soft-delete, and its parent's when one is joined.
 *
 * Shared with `kpi-summary.ts` so the three aggregations cannot drift into
 * counting different row sets — which is exactly how a joined source would
 * break, by having one query forget the parent's `deleted_at`.
 */
export function liveInPeriodConditions(source: UgcSource, start: Date, end: Date): SQL[] {
  const { createdAtColumn, deletedAtColumn, parentJoin } = source;

  const conditions = [gte(createdAtColumn, start), lte(createdAtColumn, end)];
  if (deletedAtColumn) {
    conditions.push(isNull(deletedAtColumn));
  }
  if (parentJoin?.deletedAtColumn) {
    conditions.push(isNull(parentJoin.deletedAtColumn));
  }
  return conditions;
}

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
  const { table, createdAtColumn, parentJoin } = source;

  const dateExpr = sql<string>`DATE(${createdAtColumn} AT TIME ZONE 'UTC')`;

  const conditions = liveInPeriodConditions(source, start, end);

  const base = db
    .select({
      date: dateExpr.as('date'),
      count: count(),
    })
    .from(table);

  const rows = await (parentJoin ? base.innerJoin(parentJoin.table, parentJoin.on) : base)
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
