import { and, count, gte, isNull, lte, sql } from 'drizzle-orm';
import { type PgColumn, type PgTable } from 'drizzle-orm/pg-core';

import { db, positions, topicPosts } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * UGC source descriptor for dashboard aggregation.
 *
 * Each descriptor points at a table that stores user-generated content and
 * declares the columns needed to (a) bucket records by day and (b) exclude
 * logically-deleted rows. The KPI card and the time-series chart both iterate
 * over `UGC_SOURCES` so that adding a new UGC entity is a one-line change here.
 *
 * If a future UGC table does not use soft-delete, set `deletedAtColumn` to
 * `null` and the aggregation will skip the `IS NULL` filter for that source.
 */
type UgcSource = {
  table: PgTable;
  createdAtColumn: PgColumn;
  deletedAtColumn: PgColumn | null;
};

export const UGC_SOURCES: readonly UgcSource[] = [
  {
    table: topicPosts,
    createdAtColumn: topicPosts.createdAt,
    deletedAtColumn: topicPosts.deletedAt,
  },
  {
    table: positions,
    createdAtColumn: positions.createdAt,
    deletedAtColumn: positions.deletedAt,
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
