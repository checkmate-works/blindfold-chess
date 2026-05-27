export type DailyCount = {
  date: string; // YYYY-MM-DD
  count: number;
};

/**
 * Bucket a list of items by UTC day within a date range.
 *
 * Pure function — takes already-fetched items and a date extractor, and
 * returns a `DailyCount[]` covering every day in [startDate, endDate]
 * (zero-count days included) plus the total.
 */
export function aggregateByDay<T>(
  items: readonly T[],
  getDate: (item: T) => string | Date,
  range: { startDate: string; endDate: string }
): { daily: DailyCount[]; total: number } {
  const start = new Date(`${range.startDate}T00:00:00Z`);
  const end = new Date(`${range.endDate}T23:59:59.999Z`);

  const countsByDate = new Map<string, number>();

  for (const item of items) {
    const raw = getDate(item);
    const createdAt = raw instanceof Date ? raw : new Date(raw);
    if (createdAt >= start && createdAt <= end) {
      const dateKey = createdAt.toISOString().slice(0, 10);
      countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
    }
  }

  const daily = fillDateRange(range.startDate, range.endDate, countsByDate);
  const total = daily.reduce((sum, d) => sum + d.count, 0);

  return { daily, total };
}

/**
 * Fill a date range with counts, including zero-count days.
 */
export function fillDateRange(
  startDate: string,
  endDate: string,
  countsByDate: Map<string, number>
): DailyCount[] {
  const result: DailyCount[] = [];
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (current <= end) {
    const dateKey = current.toISOString().slice(0, 10);
    result.push({ date: dateKey, count: countsByDate.get(dateKey) ?? 0 });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
}
