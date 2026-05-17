/**
 * UTC period-boundary helpers.
 *
 * - `startOfUtcDay` returns 00:00:00 UTC of the current day.
 * - `startOfCurrentWeek` returns the UTC Monday 00:00:00 of the current week.
 * - `startOfCurrentMonth` returns the UTC first-of-month 00:00:00 of the current month.
 *
 * Centralized here so every UTC boundary uses one definition — previously
 * the same `Date.UTC(...)` idiom was duplicated across challenge queries,
 * the exp leaderboard, and the points daily cap.
 */

export function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

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
