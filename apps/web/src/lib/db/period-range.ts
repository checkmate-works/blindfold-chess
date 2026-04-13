/**
 * Period boundary helpers shared by leaderboard queries.
 *
 * - `startOfCurrentWeek` returns the UTC Monday 00:00:00 of the current week.
 * - `startOfCurrentMonth` returns the UTC first-of-month 00:00:00 of the current month.
 *
 * Centralized here so challenge-queries and exp leaderboard both use the same
 * boundary definition (previously duplicated in two places).
 */

export function startOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday-based week
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
}

export function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
