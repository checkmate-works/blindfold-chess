export type DatePeriod = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth";

export type PeriodRange = {
  start: Date;
  end: Date;
};

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local-midnight truncation of the reference instant. */
function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Resolve a named period to a concrete `[start, end)` date range.
 *
 * `now` is the reference instant the period is anchored to; it defaults to
 * the wall clock and exists so callers (and tests) can pin the range to a
 * known date instead of depending on when the function happens to run.
 */
export function getPeriodRange(
  period: DatePeriod,
  now: Date = new Date(),
): PeriodRange {
  const today = startOfDay(now);

  switch (period) {
    case "thisWeek": {
      const monday = getMondayOfWeek(today);
      const end = new Date(today);
      end.setDate(end.getDate() + 1); // end of today (exclusive)
      return { start: monday, end };
    }
    case "lastWeek": {
      const thisMonday = getMondayOfWeek(today);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      return { start: lastMonday, end: thisMonday };
    }
    case "thisMonth": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    case "lastMonth": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end };
    }
  }
}

/**
 * The range immediately before {@link getPeriodRange}'s, for period-over-period
 * comparisons. Same `now` semantics as `getPeriodRange`.
 */
export function getPreviousPeriodRange(
  period: DatePeriod,
  now: Date = new Date(),
): PeriodRange {
  switch (period) {
    case "thisWeek":
      return getPeriodRange("lastWeek", now);
    case "lastWeek": {
      // 2 weeks ago
      const today = startOfDay(now);
      const thisMonday = getMondayOfWeek(today);
      const twoWeeksAgoMonday = new Date(thisMonday);
      twoWeeksAgoMonday.setDate(twoWeeksAgoMonday.getDate() - 14);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      return { start: twoWeeksAgoMonday, end: lastMonday };
    }
    case "thisMonth":
      return getPeriodRange("lastMonth", now);
    case "lastMonth": {
      // 2 months ago
      const today = startOfDay(now);
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { start, end };
    }
  }
}
