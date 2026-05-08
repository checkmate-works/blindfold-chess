import type { SupabaseClient } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase/admin';

import { type DailyCount, aggregateByDay } from './aggregate-by-day';

/**
 * Paginated fetch of all Supabase Auth users.
 *
 * Pure I/O: walks `auth.admin.listUsers` until exhausted and returns only
 * the `created_at` field (all we need for day-bucket aggregation). Split
 * from `getNewUsersPerDay` so the aggregation step becomes a pure,
 * testable function.
 *
 * Supabase Admin API does not support date-range filtering, so callers
 * must filter in JS. The listUsers endpoint paginates at 1000 max.
 *
 * // TODO: Replace with DB-level aggregation when user count exceeds ~5000
 */
export async function fetchAllAuthUsers(
  adminClient: SupabaseClient = createAdminClient()
): Promise<{ created_at: string }[]> {
  const allUsers: { created_at: string }[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data } = await adminClient.auth.admin.listUsers({ page, perPage });
    const users = data?.users ?? [];
    if (users.length === 0) break;
    allUsers.push(...users.map((u) => ({ created_at: u.created_at })));
    if (users.length < perPage) break;
    page++;
  }

  return allUsers;
}

/**
 * Aggregate new user sign-ups per day from auth.users.created_at.
 *
 * Delegates to `fetchAllAuthUsers` (pure I/O) and `aggregateByDay`
 * (pure aggregation). See those helpers for details.
 */
export async function getNewUsersPerDay(
  startDate: string,
  endDate: string
): Promise<{ daily: DailyCount[]; total: number }> {
  const allUsers = await fetchAllAuthUsers();
  return aggregateByDay(allUsers, (u) => u.created_at, { startDate, endDate });
}
