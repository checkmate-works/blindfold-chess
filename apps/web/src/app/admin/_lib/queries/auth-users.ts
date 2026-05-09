import { listAllAuthUsers } from '@/lib/supabase/list-all-auth-users';

import { type DailyCount, aggregateByDay } from './aggregate-by-day';

/**
 * Aggregate new user sign-ups per day from auth.users.created_at.
 *
 * The Supabase Admin API does not support date-range filtering, so we walk
 * the full user list via `listAllAuthUsers` (the shared paginator that
 * `/admin/users` also uses) and bucket per UTC day in JS via
 * `aggregateByDay` (a pure helper covered by its own tests).
 *
 * // TODO: Replace with DB-level aggregation when user count exceeds ~5000.
 */
export async function getNewUsersPerDay(
  startDate: string,
  endDate: string
): Promise<{ daily: DailyCount[]; total: number }> {
  const allUsers = await listAllAuthUsers();
  return aggregateByDay(allUsers, (u) => u.created_at, { startDate, endDate });
}
