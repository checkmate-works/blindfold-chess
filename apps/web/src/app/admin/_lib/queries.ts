import { and, count, gte, isNull, lte, sql } from 'drizzle-orm';
import { type PgColumn, type PgTable } from 'drizzle-orm/pg-core';

import { db, likes, positions, topicPosts } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

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
type UgcSource = {
  /** Stable identifier used as a key in summary responses and i18n lookups. */
  name: 'topic_posts' | 'positions';
  table: PgTable;
  createdAtColumn: PgColumn;
  deletedAtColumn: PgColumn | null;
  userIdColumn: PgColumn;
  /** Categorical column used for per-source breakdown rows. */
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
];

export type DailyCount = {
  date: string; // YYYY-MM-DD
  count: number;
};

/**
 * Aggregate new user sign-ups per day from auth.users.created_at.
 *
 * Supabase Admin API does not support date-range filtering, so we fetch all
 * users and aggregate in JS. The listUsers endpoint paginates at 1000 max,
 * so we loop until exhausted.
 *
 * // TODO: Replace with DB-level aggregation when user count exceeds ~5000
 */
export async function getNewUsersPerDay(
  startDate: string,
  endDate: string
): Promise<{ daily: DailyCount[]; total: number }> {
  const adminClient = createAdminClient();

  const allUsers: { created_at: string }[] = [];
  let page = 1;
  const perPage = 1000;

  // Fetch all users from Supabase Auth (paginated)
  while (true) {
    const { data } = await adminClient.auth.admin.listUsers({ page, perPage });
    const users = data?.users ?? [];
    if (users.length === 0) break;
    allUsers.push(...users.map((u) => ({ created_at: u.created_at })));
    if (users.length < perPage) break;
    page++;
  }

  // Filter to date range and aggregate by day
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  const countsByDate = new Map<string, number>();

  for (const user of allUsers) {
    const createdAt = new Date(user.created_at);
    if (createdAt >= start && createdAt <= end) {
      const dateKey = createdAt.toISOString().slice(0, 10);
      countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
    }
  }

  // Fill in all dates in range (including zero-count days)
  const daily = fillDateRange(startDate, endDate, countsByDate);
  const total = daily.reduce((sum, d) => sum + d.count, 0);

  return { daily, total };
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
 * Sums contributions from every entry in `UGC_SOURCES` (currently
 * `topic_posts` and `positions`) into a single combined series. Soft-deleted
 * rows are excluded. To add a new UGC entity, append it to `UGC_SOURCES` —
 * no changes are needed here.
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

/**
 * Number of whole days (inclusive) covered by [startDate, endDate].
 * Returns 0 if endDate precedes startDate.
 */
function daysInRange(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (end < start) return 0;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

/** Safe division — returns 0 when the denominator is 0. */
function safeDiv(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

export type UgcBreakdownRow = {
  /** Stable identifier for the UGC source (e.g. "topic_posts"). */
  source: UgcSource['name'];
  /** The raw value of the breakdown column (e.g. "opening", "memory"). */
  key: string;
  count: number;
};

export type KpiSummary = {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  users: {
    total: number;
    avgPerDay: number;
  };
  ugcPosts: {
    total: number;
    avgPerDay: number;
    activePosters: number;
    avgPerActivePoster: number;
    breakdown: UgcBreakdownRow[];
  };
  likes: {
    total: number;
    avgPerDay: number;
  };
};

/**
 * Counts distinct users who posted at least one UGC item in the period.
 * Fetches distinct user_ids per source via Drizzle selectDistinct,
 * then unions them in the application layer using a Set.
 */
async function countActivePosters(start: Date, end: Date): Promise<number> {
  const perSourceUsers = await Promise.all(
    UGC_SOURCES.map(async (source) => {
      const { table, createdAtColumn, deletedAtColumn, userIdColumn } = source;
      const conditions = [gte(createdAtColumn, start), lte(createdAtColumn, end)];
      if (deletedAtColumn) {
        conditions.push(isNull(deletedAtColumn));
      }
      const rows = await db
        .selectDistinct({ userId: userIdColumn })
        .from(table)
        .where(and(...conditions));
      return rows.map((r) => r.userId as string);
    })
  );

  const unioned = new Set<string>();
  for (const userIds of perSourceUsers) {
    for (const id of userIds) unioned.add(id);
  }
  return unioned.size;
}

/**
 * Aggregate a single UGC source's totals per breakdown column value.
 * Returns an empty array when the source has no `breakdownColumn`.
 */
async function getUgcSourceBreakdown(
  source: UgcSource,
  start: Date,
  end: Date
): Promise<UgcBreakdownRow[]> {
  const { name, table, createdAtColumn, deletedAtColumn, breakdownColumn } = source;
  if (!breakdownColumn) return [];

  const conditions = [gte(createdAtColumn, start), lte(createdAtColumn, end)];
  if (deletedAtColumn) {
    conditions.push(isNull(deletedAtColumn));
  }

  const rows = await db
    .select({
      key: breakdownColumn,
      count: count(),
    })
    .from(table)
    .where(and(...conditions))
    .groupBy(breakdownColumn);

  return rows
    .map((r) => ({ source: name, key: String(r.key), count: r.count }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Count likes created in the period. The `likes` table has no soft-delete
 * column, so no `deletedAt` filter is applied.
 */
async function countLikesInPeriod(start: Date, end: Date): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(likes)
    .where(and(gte(likes.createdAt, start), lte(likes.createdAt, end)));
  return rows[0]?.total ?? 0;
}

/**
 * Aggregate KPI-summary metrics that are NOT already computed by the caller.
 *
 * The caller (the admin dashboard page) already computes `newUsers` and
 * `postsPerDay` via `getNewUsersPerDay` / `getPostsPerDay` for the chart and
 * summary cards. Those totals are passed in to avoid re-running the expensive
 * Supabase Auth paging and duplicate Drizzle day-bucket queries.
 *
 * This function is therefore focused on the additional aggregations needed by
 * the KPI summary table: distinct active posters, per-source breakdown rows,
 * and likes total in period.
 */
export async function getKpiSummary({
  startDate,
  endDate,
  usersTotalInPeriod,
  ugcTotalInPeriod,
}: {
  startDate: string;
  endDate: string;
  usersTotalInPeriod: number;
  ugcTotalInPeriod: number;
}): Promise<KpiSummary> {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);
  const days = daysInRange(startDate, endDate);

  const [activePosters, breakdownPerSource, likesTotal] = await Promise.all([
    countActivePosters(start, end),
    Promise.all(UGC_SOURCES.map((source) => getUgcSourceBreakdown(source, start, end))),
    countLikesInPeriod(start, end),
  ]);

  const breakdown: UgcBreakdownRow[] = breakdownPerSource.flat();

  return {
    period: { startDate, endDate, days },
    users: {
      total: usersTotalInPeriod,
      avgPerDay: safeDiv(usersTotalInPeriod, days),
    },
    ugcPosts: {
      total: ugcTotalInPeriod,
      avgPerDay: safeDiv(ugcTotalInPeriod, days),
      activePosters,
      avgPerActivePoster: safeDiv(ugcTotalInPeriod, activePosters),
      breakdown,
    },
    likes: {
      total: likesTotal,
      avgPerDay: safeDiv(likesTotal, days),
    },
  };
}

/**
 * Fill a date range with counts, including zero-count days.
 */
export function fillDateRange(
  startDate: string,
  endDate: string,
  countsByDate: Map<string, number>
): DailyCount[] {
  const result: DailyCount[] = [];
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (current <= end) {
    const dateKey = current.toISOString().slice(0, 10);
    result.push({ date: dateKey, count: countsByDate.get(dateKey) ?? 0 });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
}
