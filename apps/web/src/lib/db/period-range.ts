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
 *
 * Each takes the reference instant as a defaulted parameter. The default
 * keeps the DB call sites unchanged; passing it makes the arithmetic — the
 * Sunday-to-Monday rollover in particular — checkable without moving the
 * system clock. Downstream tests used to `vi.mock` this whole module purely
 * to escape the hidden clock, and the points daily cap documents itself as
 * "deterministic" on top of it.
 */

export function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function startOfCurrentWeek(now: Date = new Date()): Date {
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday-based week
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
}

export function startOfCurrentMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
