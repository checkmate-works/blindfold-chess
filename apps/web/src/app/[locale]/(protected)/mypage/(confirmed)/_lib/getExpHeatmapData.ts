import { and, eq, gte, lte, sql, sum } from 'drizzle-orm';

import { db, expEvents } from '@/lib/db';

import { DESKTOP_WEEKS, formatDate, getHeatmapDateRangeForWeeks } from './heatmap-utils';

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
  const { startDate, endDate } = getHeatmapDateRangeForWeeks(new Date(), DESKTOP_WEEKS);

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

  // The heatmap cell's color comes from `daily` and its tooltip breakdown
  // from `dailyByModule`, so both must bucket on the same key — the
  // derivation is named once rather than copy-pasted into each pass, where a
  // timezone fix applied to one would desync the cell from its tooltip.
  const bucketKey = (date: unknown): string =>
    typeof date === 'string' ? date : formatDate(new Date(date as string | number | Date));

  const daily: Record<string, number> = Object.fromEntries(
    dailyRows.map((row) => [bucketKey(row.date), Number(row.total) || 0])
  );

  const dailyByModule: Record<string, Record<string, number>> = {};
  for (const row of moduleRows) {
    const dateStr = bucketKey(row.date);
    const moduleKey = row.menuType ?? 'unknown';
    dailyByModule[dateStr] = {
      ...dailyByModule[dateStr],
      [moduleKey]: Number(row.total) || 0,
    };
  }

  return { daily, dailyByModule };
}
