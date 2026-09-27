/**
 * Pure helpers for the monthly leaderboard badge batch: which month it
 * awards, and how newly granted badges fold into one notification per user.
 * The ranking itself stays in SQL (`grant-monthly-leaderboard-badges.ts`) so
 * it cannot drift from how the leaderboard ranks.
 */

export type GrantedBadgeInfo = {
  slug: string;
  menuType: string;
  leaderboardKey: string;
  placement: number;
};

/** Returns the previous month's year and month (1-based) relative to `now`, in UTC. */
export function getPreviousMonth(now: Date): { year: number; month: number } {
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(); // getUTCMonth() is 0-based
  return { year, month };
}

/** Returns the half-open `[start, end)` range of the given year/month (UTC). */
export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1)); // first day of next month
  return { start, end };
}

/**
 * Fold the badges granted across every achievement definition into one list
 * per user, preserving grant order, so each user gets a single notification.
 */
export function groupGrantedBadgesByUser(
  granted: readonly { userId: string; info: GrantedBadgeInfo }[]
): Map<string, GrantedBadgeInfo[]> {
  const byUser = new Map<string, GrantedBadgeInfo[]>();
  for (const { userId, info } of granted) {
    byUser.set(userId, [...(byUser.get(userId) ?? []), info]);
  }
  return byUser;
}

/** The per-user/month key that makes the grant notification idempotent. */
export function monthlyGrantNotificationGroupKey(
  userId: string,
  year: number,
  month: number
): string {
  return `achievement-monthly-${userId}-${year}-${month}`;
}
