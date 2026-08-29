/**
 * Heatmap utility functions for Exp activity visualization.
 *
 * Provides color-level calculation and date range helpers
 * used by the ExpActivityHeatmap component.
 */

/** Number of weeks shown in the desktop heatmap grid. */
export const DESKTOP_WEEKS = 46;

/**
 * Returns a 0–4 intensity level for a given Exp amount.
 *
 * Level 0 means no activity. Levels 1–4 divide the positive range
 * into quartiles based on the maximum value in the dataset.
 */
export function getExpLevel(amount: number, maxAmount: number): number {
  if (amount <= 0 || maxAmount <= 0) return 0;

  const ratio = amount / maxAmount;

  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/**
 * Generates an array of UTC calendar dates from startDate to endDate
 * (inclusive), formatted as 'YYYY-MM-DD' strings.
 */
export function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(utcDateKey(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Builds a date range for a given number of weeks, aligned to full UTC weeks
 * starting on Sunday.
 *
 * Used by the responsive heatmap: 53 weeks on desktop, 26 weeks on mobile.
 * Anchored to UTC calendar days so the range agrees with the UTC-day
 * bucketing `getExpHeatmapData` uses to aggregate Exp events — otherwise the
 * grid's "today" column can disagree with which day an event was bucketed
 * under, for any viewer not on UTC.
 */
export function getHeatmapDateRangeForWeeks(
  today: Date,
  totalWeeks: number
): { startDate: Date; endDate: Date } {
  const endDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  const dayOfWeek = endDate.getUTCDay();
  const currentSunday = new Date(endDate);
  currentSunday.setUTCDate(endDate.getUTCDate() - dayOfWeek);

  const startDate = new Date(currentSunday);
  startDate.setUTCDate(currentSunday.getUTCDate() - (totalWeeks - 1) * 7);

  return { startDate, endDate };
}

/**
 * Returns an array of the most recent `days` UTC date strings (YYYY-MM-DD),
 * ending on `today`, in ascending chronological order.
 */
export function getRecentDays(today: Date, days: number): string[] {
  const result: string[] = [];
  const current = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  current.setUTCDate(current.getUTCDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    result.push(utcDateKey(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return result;
}

/**
 * Computes month label positions for a weekly heatmap grid.
 *
 * For each week, checks the first non-null date's month. When the month
 * changes (or for the very first week), a label is placed at that column.
 * Labels that would appear on consecutive columns are skipped to avoid overlap.
 *
 * @param weeks  The 2-D weeks array (columns of up to 7 date strings).
 * @param monthNames  Array of 12 short month names (index 0 = January).
 */
export function getMonthLabelsForWeeks(
  weeks: (string | null)[][],
  monthNames: string[]
): { weekIdx: number; label: string }[] {
  const labels: { weekIdx: number; label: string }[] = [];
  let prevMonth: number | null = null;

  for (let i = 0; i < weeks.length; i++) {
    const firstDate = weeks[i].find((d) => d !== null);
    if (!firstDate) continue;

    const month = new Date(firstDate + 'T00:00:00Z').getUTCMonth();
    if (month !== prevMonth) {
      // Skip if too close to the previous label (avoid overlap)
      const lastLabel = labels[labels.length - 1];
      if (!lastLabel || i - lastLabel.weekIdx >= 2) {
        labels.push({ weekIdx: i, label: monthNames[month] });
      }
      prevMonth = month;
    }
  }

  return labels;
}

/** Builds weeks (columns) from a flat date array — each week is up to 7 days. */
export function buildWeeks(allDates: string[]): (string | null)[][] {
  const weeks: (string | null)[][] = [];
  let currentWeek: (string | null)[] = [];

  for (const dateStr of allDates) {
    const date = new Date(dateStr + 'T00:00:00Z');
    const dayOfWeek = date.getUTCDay(); // 0=Sunday

    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(dateStr);
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

/**
 * Formats a Date as 'YYYY-MM-DD' using its UTC calendar day — the same
 * convention `getExpHeatmapData` buckets Exp events under
 * (`DATE(created_at AT TIME ZONE 'UTC')`), so a cell's key always matches
 * the day its data was aggregated into, regardless of the viewer's or
 * server's local timezone.
 */
export function utcDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
