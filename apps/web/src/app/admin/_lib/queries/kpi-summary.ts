import { and, count, gte, isNull, lte } from 'drizzle-orm';

import { db, likes } from '@/lib/db';

import { UGC_SOURCES, type UgcSource } from './ugc-aggregation';

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
