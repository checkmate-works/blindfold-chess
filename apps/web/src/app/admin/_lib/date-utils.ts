/**
 * `YYYY-MM-DD` helpers for the admin date-range picker.
 *
 * Both take the reference instant as a defaulted parameter: the callers (the
 * admin page and the picker) read the clock, and leap days, year boundaries
 * and DST edges become checkable without `vi.setSystemTime` — which every
 * case in this module's suite previously needed.
 */

/** The UTC date `days - 1` days before `now`, inclusive of today. */
export function daysAgo(days: number, now: Date = new Date()): string {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1)
  );
  return start.toISOString().slice(0, 10);
}

export function today(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
