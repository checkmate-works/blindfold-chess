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
 * Generates an array of dates from startDate to endDate (inclusive),
 * formatted as 'YYYY-MM-DD' strings.
 */
export function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Builds a date range for a given number of weeks, aligned to full weeks
 * starting on Sunday.
 *
 * Used by the responsive heatmap: 53 weeks on desktop, 26 weeks on mobile.
 */
export function getHeatmapDateRangeForWeeks(
  today: Date,
  totalWeeks: number
): { startDate: Date; endDate: Date } {
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const dayOfWeek = endDate.getDay();
  const currentSunday = new Date(endDate);
  currentSunday.setDate(endDate.getDate() - dayOfWeek);

  const startDate = new Date(currentSunday);
  startDate.setDate(currentSunday.getDate() - (totalWeeks - 1) * 7);

  return { startDate, endDate };
}

/**
 * Returns an array of the most recent `days` date strings (YYYY-MM-DD),
 * ending on `today`, in ascending chronological order.
 */
export function getRecentDays(today: Date, days: number): string[] {
  const result: string[] = [];
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  current.setDate(current.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    result.push(formatDate(current));
    current.setDate(current.getDate() + 1);
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

/** Formats a Date as 'YYYY-MM-DD'. */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
