import { describe, expect, it } from 'vitest';

import { formatDate, generateDateRange, getExpLevel, getHeatmapDateRange } from './heatmap-utils';

describe('getExpLevel', () => {
  it('returns 0 when amount is 0', () => {
    expect(getExpLevel(0, 100)).toBe(0);
  });

  it('returns 0 when maxAmount is 0', () => {
    expect(getExpLevel(50, 0)).toBe(0);
  });

  it('returns 0 for negative amount', () => {
    expect(getExpLevel(-10, 100)).toBe(0);
  });

  it('returns 1 for low ratio (<=25%)', () => {
    expect(getExpLevel(25, 100)).toBe(1);
    expect(getExpLevel(1, 100)).toBe(1);
  });

  it('returns 2 for medium-low ratio (26-50%)', () => {
    expect(getExpLevel(50, 100)).toBe(2);
    expect(getExpLevel(26, 100)).toBe(2);
  });

  it('returns 3 for medium-high ratio (51-75%)', () => {
    expect(getExpLevel(75, 100)).toBe(3);
    expect(getExpLevel(51, 100)).toBe(3);
  });

  it('returns 4 for high ratio (>75%)', () => {
    expect(getExpLevel(76, 100)).toBe(4);
    expect(getExpLevel(100, 100)).toBe(4);
  });

  it('returns 4 when amount equals maxAmount', () => {
    expect(getExpLevel(200, 200)).toBe(4);
  });

  it('returns 4 when amount exceeds maxAmount', () => {
    expect(getExpLevel(150, 100)).toBe(4);
  });

  it('returns 0 when maxAmount is negative', () => {
    expect(getExpLevel(50, -10)).toBe(0);
  });

  it('returns 0 when both amount and maxAmount are negative', () => {
    expect(getExpLevel(-5, -10)).toBe(0);
  });

  it('returns 0 when both amount and maxAmount are zero', () => {
    expect(getExpLevel(0, 0)).toBe(0);
  });

  it('handles very small fractional amounts', () => {
    expect(getExpLevel(0.01, 100)).toBe(1);
  });

  it('returns correct level at exact boundary 25%', () => {
    expect(getExpLevel(25, 100)).toBe(1);
  });

  it('returns correct level just above 25% boundary', () => {
    expect(getExpLevel(25.01, 100)).toBe(2);
  });

  it('returns correct level just above 50% boundary', () => {
    expect(getExpLevel(50.01, 100)).toBe(3);
  });

  it('returns correct level just above 75% boundary', () => {
    expect(getExpLevel(75.01, 100)).toBe(4);
  });
});

describe('getHeatmapDateRange', () => {
  it('returns a range ending on the given date', () => {
    const today = new Date(2026, 3, 8); // 2026-04-08 (Wednesday)
    const { endDate } = getHeatmapDateRange(today);
    expect(formatDate(endDate)).toBe('2026-04-08');
  });

  it('starts on a Sunday', () => {
    const today = new Date(2026, 3, 8);
    const { startDate } = getHeatmapDateRange(today);
    expect(startDate.getDay()).toBe(0); // Sunday
  });

  it('covers approximately 53 weeks', () => {
    const today = new Date(2026, 3, 8);
    const { startDate, endDate } = getHeatmapDateRange(today);
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    // 53 weeks = 371 days, but endDate may be mid-week
    expect(diffDays).toBeGreaterThanOrEqual(364); // at least 52 weeks
    expect(diffDays).toBeLessThanOrEqual(377); // at most ~54 weeks
  });

  it('when today is Sunday, start is 52 weeks before', () => {
    const sunday = new Date(2026, 3, 5); // 2026-04-05 (Sunday)
    const { startDate, endDate } = getHeatmapDateRange(sunday);
    expect(startDate.getDay()).toBe(0);
    expect(formatDate(endDate)).toBe('2026-04-05');
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(364); // exactly 52 weeks
  });

  it('when today is Saturday, start is Sunday of 53 weeks ago', () => {
    const saturday = new Date(2026, 3, 4); // 2026-04-04 (Saturday)
    const { startDate, endDate } = getHeatmapDateRange(saturday);
    expect(startDate.getDay()).toBe(0);
    expect(formatDate(endDate)).toBe('2026-04-04');
    // Saturday is 6 days after Sunday of the same week
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(364 + 6); // 52 weeks + 6 days
  });

  it('handles year boundary (January date looking back to previous year)', () => {
    const jan15 = new Date(2026, 0, 15); // 2026-01-15 (Thursday)
    const { startDate, endDate } = getHeatmapDateRange(jan15);
    expect(startDate.getDay()).toBe(0);
    expect(formatDate(endDate)).toBe('2026-01-15');
    // Start date should be in January 2025 (52 weeks back)
    expect(startDate.getFullYear()).toBe(2025);
    expect(startDate.getMonth()).toBe(0); // January
  });

  it('handles January 1st', () => {
    const jan1 = new Date(2026, 0, 1); // 2026-01-01 (Thursday)
    const { startDate, endDate } = getHeatmapDateRange(jan1);
    expect(startDate.getDay()).toBe(0);
    expect(formatDate(endDate)).toBe('2026-01-01');
    // 52 weeks back from 2025-12-28 (Sunday of Jan 1's week) = 2024-12-29
    expect(startDate.getFullYear()).toBe(2024);
  });

  it('handles December 31st', () => {
    const dec31 = new Date(2025, 11, 31); // 2025-12-31 (Wednesday)
    const { startDate, endDate } = getHeatmapDateRange(dec31);
    expect(startDate.getDay()).toBe(0);
    expect(formatDate(endDate)).toBe('2025-12-31');
  });

  it("when today is Monday, start is Sunday of previous day's week minus 52 weeks", () => {
    const monday = new Date(2026, 3, 6); // 2026-04-06 (Monday)
    const { startDate, endDate } = getHeatmapDateRange(monday);
    expect(startDate.getDay()).toBe(0);
    expect(formatDate(endDate)).toBe('2026-04-06');
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(364 + 1); // 52 weeks + 1 day (Monday)
  });
});

describe('generateDateRange', () => {
  it('generates inclusive date range', () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 3);
    const dates = generateDateRange(start, end);
    expect(dates).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });

  it('returns single date when start equals end', () => {
    const date = new Date(2026, 5, 15);
    const dates = generateDateRange(date, date);
    expect(dates).toEqual(['2026-06-15']);
  });

  it('returns empty array when start is after end', () => {
    const start = new Date(2026, 0, 5);
    const end = new Date(2026, 0, 1);
    const dates = generateDateRange(start, end);
    expect(dates).toEqual([]);
  });

  it('generates dates across month boundary', () => {
    const start = new Date(2026, 0, 30);
    const end = new Date(2026, 1, 2);
    const dates = generateDateRange(start, end);
    expect(dates).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
  });

  it('generates dates across year boundary', () => {
    const start = new Date(2025, 11, 30);
    const end = new Date(2026, 0, 2);
    const dates = generateDateRange(start, end);
    expect(dates).toEqual(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']);
  });

  it('does not mutate the input start date', () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 3);
    const originalTime = start.getTime();
    generateDateRange(start, end);
    expect(start.getTime()).toBe(originalTime);
  });
});

describe('formatDate', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(formatDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('pads single-digit month and day', () => {
    expect(formatDate(new Date(2026, 2, 5))).toBe('2026-03-05');
  });

  it('formats double-digit month and day without extra padding', () => {
    expect(formatDate(new Date(2026, 10, 25))).toBe('2026-11-25');
  });

  it('formats February 29 in a leap year', () => {
    expect(formatDate(new Date(2024, 1, 29))).toBe('2024-02-29');
  });
});
