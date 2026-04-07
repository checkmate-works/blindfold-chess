/**
 * Heatmap utility functions for Exp activity visualization.
 *
 * Provides color-level calculation and date range helpers
 * used by the ExpActivityHeatmap component.
 */

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
 * Builds a date range covering approximately the last year (53 weeks),
 * aligned to full weeks starting on Sunday.
 *
 * @returns An object with `startDate` (the Sunday 53 weeks before the
 *          current week) and `endDate` (today).
 */
export function getHeatmapDateRange(today: Date): { startDate: Date; endDate: Date } {
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Find the Sunday of the current week
  const dayOfWeek = endDate.getDay(); // 0=Sunday
  const currentSunday = new Date(endDate);
  currentSunday.setDate(endDate.getDate() - dayOfWeek);

  // Go back 52 more weeks (53 weeks total including current week)
  const startDate = new Date(currentSunday);
  startDate.setDate(currentSunday.getDate() - 52 * 7);

  return { startDate, endDate };
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

/** Formats a Date as 'YYYY-MM-DD'. */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
