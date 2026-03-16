import { and, count, gte, lte, sql } from 'drizzle-orm';

import { db, topicPosts } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

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
 * Aggregate topic_posts per day using Drizzle ORM.
 */
export async function getPostsPerDay(
  startDate: string,
  endDate: string
): Promise<{ daily: DailyCount[]; total: number }> {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  const rows = await db
    .select({
      date: sql<string>`DATE(${topicPosts.createdAt} AT TIME ZONE 'UTC')`.as('date'),
      count: count(),
    })
    .from(topicPosts)
    .where(and(gte(topicPosts.createdAt, start), lte(topicPosts.createdAt, end)))
    .groupBy(sql`DATE(${topicPosts.createdAt} AT TIME ZONE 'UTC')`)
    .orderBy(sql`DATE(${topicPosts.createdAt} AT TIME ZONE 'UTC')`);

  const countsByDate = new Map<string, number>();
  for (const row of rows) {
    countsByDate.set(row.date, row.count);
  }

  const daily = fillDateRange(startDate, endDate, countsByDate);
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
