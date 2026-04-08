import { and, eq, gte, lte, sql, sum } from 'drizzle-orm';

import { db, expEvents } from '@/lib/db';

import { formatDate, getHeatmapDateRange } from './heatmap-utils';

export type ExpHeatmapData = {
  /** Daily totals keyed by 'YYYY-MM-DD'. */
  daily: Record<string, number>;
  /** Daily totals broken down by module (menuType), keyed by 'YYYY-MM-DD'. */
  dailyByModule: Record<string, Record<string, number>>;
};

/**
 * Fetches daily Exp totals and per-module breakdowns for the heatmap.
 *
 * Uses the existing `idx_exp_events_user_created(userId, createdAt)` index
 * for efficient range scanning.
 */
export async function getExpHeatmapData(userId: string): Promise<ExpHeatmapData> {
  const { startDate, endDate } = getHeatmapDateRange(new Date());

  // endDate is midnight; extend to end of day for the query
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const whereClause = and(
    eq(expEvents.userId, userId),
    gte(expEvents.createdAt, startDate),
    lte(expEvents.createdAt, endOfDay)
  );

  const dateExpr = sql<string>`DATE(${expEvents.createdAt} AT TIME ZONE 'UTC')`;

  // Fetch daily totals and per-module breakdowns in parallel
  const [dailyRows, moduleRows] = await Promise.all([
    db
      .select({
        date: dateExpr.as('date'),
        total: sum(expEvents.amount).as('total'),
      })
      .from(expEvents)
      .where(whereClause)
      .groupBy(dateExpr),
    db
      .select({
        date: dateExpr.as('date'),
        menuType: expEvents.menuType,
        total: sum(expEvents.amount).as('total'),
      })
      .from(expEvents)
      .where(whereClause)
      .groupBy(dateExpr, expEvents.menuType),
  ]);

  const daily: Record<string, number> = {};
  for (const row of dailyRows) {
    const dateStr = typeof row.date === 'string' ? row.date : formatDate(new Date(row.date));
    daily[dateStr] = Number(row.total) || 0;
  }

  const dailyByModule: Record<string, Record<string, number>> = {};
  for (const row of moduleRows) {
    const dateStr = typeof row.date === 'string' ? row.date : formatDate(new Date(row.date));
    const moduleKey = row.menuType ?? 'unknown';
    if (!dailyByModule[dateStr]) {
      dailyByModule[dateStr] = {};
    }
    dailyByModule[dateStr][moduleKey] = Number(row.total) || 0;
  }

  return { daily, dailyByModule };
}
