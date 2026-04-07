import { and, eq, gte, lte, sql, sum } from 'drizzle-orm';

import { db, expEvents } from '@/lib/db';

import { formatDate, getHeatmapDateRange } from './heatmap-utils';

export type ExpHeatmapData = Record<string, number>;

/**
 * Fetches daily Exp totals for the heatmap.
 *
 * Uses the existing `idx_exp_events_user_created(userId, createdAt)` index
 * for efficient range scanning.
 */
export async function getExpHeatmapData(userId: string): Promise<ExpHeatmapData> {
  const { startDate, endDate } = getHeatmapDateRange(new Date());

  // endDate is midnight; extend to end of day for the query
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const rows = await db
    .select({
      date: sql<string>`DATE(${expEvents.createdAt} AT TIME ZONE 'UTC')`.as('date'),
      total: sum(expEvents.amount).as('total'),
    })
    .from(expEvents)
    .where(
      and(
        eq(expEvents.userId, userId),
        gte(expEvents.createdAt, startDate),
        lte(expEvents.createdAt, endOfDay)
      )
    )
    .groupBy(sql`DATE(${expEvents.createdAt} AT TIME ZONE 'UTC')`);

  const result: ExpHeatmapData = {};

  for (const row of rows) {
    const dateStr = typeof row.date === 'string' ? row.date : formatDate(new Date(row.date));
    result[dateStr] = Number(row.total) || 0;
  }

  return result;
}
