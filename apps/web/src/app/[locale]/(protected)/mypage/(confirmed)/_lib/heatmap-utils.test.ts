import { describe, expect, it } from 'vitest';

import {
  buildWeeks,
  formatDate,
  generateDateRange,
  getExpLevel,
  getHeatmapDateRangeForWeeks,
  getMonthLabelsForWeeks,
  getRecentDays,
} from './heatmap-utils';

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

describe('getHeatmapDateRangeForWeeks', () => {
  it('returns a range ending on the given date', () => {
    const today = new Date(2026, 3, 8); // Wednesday
    const { endDate } = getHeatmapDateRangeForWeeks(today, 53);
    expect(formatDate(endDate)).toBe('2026-04-08');
  });

  it('starts on a Sunday', () => {
    const today = new Date(2026, 3, 8);
    const { startDate } = getHeatmapDateRangeForWeeks(today, 53);
    expect(startDate.getDay()).toBe(0);
  });

  it('covers 53 weeks when totalWeeks is 53', () => {
    const today = new Date(2026, 3, 8); // Wednesday
    const { startDate, endDate } = getHeatmapDateRangeForWeeks(today, 53);
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    // 52 full weeks back from current Sunday + days into current week
    expect(diffDays).toBeGreaterThanOrEqual(364);
    expect(diffDays).toBeLessThanOrEqual(377);
  });

  it('covers 26 weeks when totalWeeks is 26 (mobile)', () => {
    const today = new Date(2026, 3, 8); // Wednesday
    const { startDate, endDate } = getHeatmapDateRangeForWeeks(today, 26);
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    // 25 full weeks back from current Sunday + days into current week
    expect(diffDays).toBeGreaterThanOrEqual(175); // ~25 weeks
    expect(diffDays).toBeLessThanOrEqual(181); // ~26 weeks
  });

  it('when today is Sunday and totalWeeks is 26, covers exactly 25 weeks', () => {
    const sunday = new Date(2026, 3, 5); // Sunday
    const { startDate, endDate } = getHeatmapDateRangeForWeeks(sunday, 26);
    expect(startDate.getDay()).toBe(0);
    expect(formatDate(endDate)).toBe('2026-04-05');
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(175); // 25 weeks
  });

  it('returns a single week when totalWeeks is 1', () => {
    const wednesday = new Date(2026, 3, 8); // Wednesday
    const { startDate, endDate } = getHeatmapDateRangeForWeeks(wednesday, 1);
    expect(startDate.getDay()).toBe(0); // Sunday
    expect(formatDate(endDate)).toBe('2026-04-08');
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    // totalWeeks=1 means (1-1)*7=0 weeks back from current Sunday, so start is current Sunday
    expect(diffDays).toBe(3); // Wednesday - Sunday = 3 days
  });

  it('when today is Saturday and totalWeeks is 26, covers 25 weeks + 6 days', () => {
    const saturday = new Date(2026, 3, 4); // Saturday
    const { startDate, endDate } = getHeatmapDateRangeForWeeks(saturday, 26);
    expect(startDate.getDay()).toBe(0);
    expect(formatDate(endDate)).toBe('2026-04-04');
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(175 + 6); // 25 weeks + 6 days (Saturday)
  });

  it('handles year boundary with 26 weeks from January', () => {
    const jan15 = new Date(2026, 0, 15); // Thursday
    const { startDate, endDate } = getHeatmapDateRangeForWeeks(jan15, 26);
    expect(startDate.getDay()).toBe(0);
    expect(formatDate(endDate)).toBe('2026-01-15');
    // 25 weeks back from Sunday 2026-01-11 = 2025-07-20
    expect(startDate.getFullYear()).toBe(2025);
    expect(startDate.getMonth()).toBe(6); // July
  });

  it('does not mutate the input date', () => {
    const today = new Date(2026, 3, 8);
    const originalTime = today.getTime();
    getHeatmapDateRangeForWeeks(today, 26);
    expect(today.getTime()).toBe(originalTime);
  });
});

describe('getRecentDays', () => {
  it('returns 7 dates ending on today', () => {
    const today = new Date(2026, 3, 8); // 2026-04-08
    const result = getRecentDays(today, 7);
    expect(result).toHaveLength(7);
    expect(result[6]).toBe('2026-04-08');
    expect(result[0]).toBe('2026-04-02');
  });

  it('returns dates in ascending order', () => {
    const today = new Date(2026, 3, 8);
    const result = getRecentDays(today, 7);
    for (let i = 1; i < result.length; i++) {
      expect(result[i] > result[i - 1]).toBe(true);
    }
  });

  it('returns a single date when days is 1', () => {
    const today = new Date(2026, 3, 8);
    const result = getRecentDays(today, 1);
    expect(result).toEqual(['2026-04-08']);
  });

  it('handles month boundary', () => {
    const today = new Date(2026, 3, 2); // 2026-04-02
    const result = getRecentDays(today, 7);
    expect(result).toEqual([
      '2026-03-27',
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
      '2026-03-31',
      '2026-04-01',
      '2026-04-02',
    ]);
  });

  it('handles year boundary', () => {
    const today = new Date(2026, 0, 3); // 2026-01-03
    const result = getRecentDays(today, 7);
    expect(result[0]).toBe('2025-12-28');
    expect(result[6]).toBe('2026-01-03');
  });

  it('does not mutate the input date', () => {
    const today = new Date(2026, 3, 8);
    const originalTime = today.getTime();
    getRecentDays(today, 7);
    expect(today.getTime()).toBe(originalTime);
  });

  it('returns empty array when days is 0', () => {
    const today = new Date(2026, 3, 8);
    const result = getRecentDays(today, 0);
    expect(result).toEqual([]);
  });

  it('returns empty array when days is negative', () => {
    const today = new Date(2026, 3, 8);
    const result = getRecentDays(today, -5);
    expect(result).toEqual([]);
  });

  it('handles large number of days (365)', () => {
    const today = new Date(2026, 3, 8); // 2026-04-08
    const result = getRecentDays(today, 365);
    expect(result).toHaveLength(365);
    expect(result[364]).toBe('2026-04-08');
    expect(result[0]).toBe('2025-04-09');
    // verify ascending order
    for (let i = 1; i < result.length; i++) {
      expect(result[i] > result[i - 1]).toBe(true);
    }
  });

  it('includes Feb 29 when spanning a leap year', () => {
    // 2024 is a leap year
    const today = new Date(2024, 2, 1); // 2024-03-01
    const result = getRecentDays(today, 3);
    expect(result).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
  });

  it('skips Feb 29 in a non-leap year', () => {
    // 2025 is not a leap year
    const today = new Date(2025, 2, 1); // 2025-03-01
    const result = getRecentDays(today, 3);
    expect(result).toEqual(['2025-02-27', '2025-02-28', '2025-03-01']);
  });

  it('handles Feb 29 as today in a leap year', () => {
    const today = new Date(2024, 1, 29); // 2024-02-29
    const result = getRecentDays(today, 1);
    expect(result).toEqual(['2024-02-29']);
  });

  it('handles very large number of days (1000)', () => {
    const today = new Date(2026, 3, 8);
    const result = getRecentDays(today, 1000);
    expect(result).toHaveLength(1000);
    expect(result[999]).toBe('2026-04-08');
    // 999 days before 2026-04-08 = 2023-07-14
    expect(result[0]).toBe('2023-07-14');
  });

  it('returns 30 dates for a full month span', () => {
    const today = new Date(2026, 3, 30); // 2026-04-30
    const result = getRecentDays(today, 30);
    expect(result).toHaveLength(30);
    expect(result[0]).toBe('2026-04-01');
    expect(result[29]).toBe('2026-04-30');
  });
});

describe('buildWeeks', () => {
  it('builds weeks from a full-week-aligned date array', () => {
    // Sun 2026-04-05 to Sat 2026-04-11 (one full week)
    const dates = generateDateRange(new Date(2026, 3, 5), new Date(2026, 3, 11));
    const weeks = buildWeeks(dates);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toEqual([
      '2026-04-05',
      '2026-04-06',
      '2026-04-07',
      '2026-04-08',
      '2026-04-09',
      '2026-04-10',
      '2026-04-11',
    ]);
  });

  it('pads the last week with null when it has fewer than 7 days', () => {
    // Sun 2026-04-05 to Wed 2026-04-08 (4 days)
    const dates = generateDateRange(new Date(2026, 3, 5), new Date(2026, 3, 8));
    const weeks = buildWeeks(dates);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toEqual([
      '2026-04-05',
      '2026-04-06',
      '2026-04-07',
      '2026-04-08',
      null,
      null,
      null,
    ]);
  });

  it('handles a partial first week (starting mid-week)', () => {
    // Wed 2026-04-01 to Sat 2026-04-11 (starts on Wednesday)
    const dates = generateDateRange(new Date(2026, 3, 1), new Date(2026, 3, 11));
    const weeks = buildWeeks(dates);
    // First week: Wed-Sat (4 days, pushed without padding when Sunday triggers new week)
    // Second week: Sun 2026-04-05 to Sat 2026-04-11 (7 days)
    expect(weeks).toHaveLength(2);
    // First week has 4 days only (no null padding for mid-stream weeks)
    expect(weeks[0]).toEqual(['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04']);
    // Second week is full
    expect(weeks[1]).toEqual([
      '2026-04-05',
      '2026-04-06',
      '2026-04-07',
      '2026-04-08',
      '2026-04-09',
      '2026-04-10',
      '2026-04-11',
    ]);
  });

  it('returns an empty array for empty input', () => {
    const weeks = buildWeeks([]);
    expect(weeks).toEqual([]);
  });

  it('handles a single date (Sunday)', () => {
    const weeks = buildWeeks(['2026-04-05']); // Sunday
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toEqual(['2026-04-05', null, null, null, null, null, null]);
  });

  it('handles a single date (non-Sunday)', () => {
    const weeks = buildWeeks(['2026-04-08']); // Wednesday
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toEqual(['2026-04-08', null, null, null, null, null, null]);
  });

  it('builds multiple weeks correctly', () => {
    // 3 full weeks: Sun 2026-03-22 to Sat 2026-04-11
    const dates = generateDateRange(new Date(2026, 2, 22), new Date(2026, 3, 11));
    const weeks = buildWeeks(dates);
    expect(weeks).toHaveLength(3);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // No nulls in any week since all are complete
    expect(weeks.every((w) => w.every((d) => d !== null))).toBe(true);
  });

  it('splits correctly at Sunday boundary', () => {
    // Sat 2026-04-04 to Sun 2026-04-05
    const dates = generateDateRange(new Date(2026, 3, 4), new Date(2026, 3, 5));
    const weeks = buildWeeks(dates);
    expect(weeks).toHaveLength(2);
    // First week: just Saturday (no padding for mid-stream weeks)
    expect(weeks[0]).toEqual(['2026-04-04']);
    // Second week: just Sunday, padded to 7 (last week)
    expect(weeks[1]).toEqual(['2026-04-05', null, null, null, null, null, null]);
  });

  it('handles dates spanning a month boundary', () => {
    // Thu 2026-01-29 to Tue 2026-02-03
    const dates = generateDateRange(new Date(2026, 0, 29), new Date(2026, 1, 3));
    const weeks = buildWeeks(dates);
    // Jan 29 (Thu), 30 (Fri), 31 (Sat) => week 1 (no padding, pushed when Sun arrives)
    // Feb 1 (Sun), 2 (Mon), 3 (Tue) => week 2 (last week, padded to 7)
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toEqual(['2026-01-29', '2026-01-30', '2026-01-31']);
    expect(weeks[1]).toEqual(['2026-02-01', '2026-02-02', '2026-02-03', null, null, null, null]);
  });
});

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

describe('getMonthLabelsForWeeks', () => {
  it('places a label when the month changes across weeks', () => {
    // Build weeks spanning Jan 18 – Feb 14, 2026 (4 full weeks, enough gap for labels)
    const allDates = generateDateRange(new Date(2026, 0, 18), new Date(2026, 1, 14));
    const weeks = buildWeeks(allDates);
    const labels = getMonthLabelsForWeeks(weeks, MONTH_NAMES);

    // First week should get a Jan label
    expect(labels[0]).toEqual({ weekIdx: 0, label: 'Jan' });

    // There should be a Feb label at a later week
    const febLabel = labels.find((l) => l.label === 'Feb');
    expect(febLabel).toBeDefined();
    expect(febLabel!.weekIdx).toBeGreaterThan(0);
  });

  it('skips labels when consecutive month boundaries are closer than 2 weeks apart', () => {
    // Manually build weeks where month changes on consecutive columns
    // Week 0: last days of Jan, Week 1: first days of Feb, Week 2: first days of Mar (artificially close)
    const weeks: (string | null)[][] = [
      [
        '2026-01-25',
        '2026-01-26',
        '2026-01-27',
        '2026-01-28',
        '2026-01-29',
        '2026-01-30',
        '2026-01-31',
      ],
      [
        '2026-02-01',
        '2026-02-02',
        '2026-02-03',
        '2026-02-04',
        '2026-02-05',
        '2026-02-06',
        '2026-02-07',
      ],
      [
        '2026-03-01',
        '2026-03-02',
        '2026-03-03',
        '2026-03-04',
        '2026-03-05',
        '2026-03-06',
        '2026-03-07',
      ],
    ];
    const labels = getMonthLabelsForWeeks(weeks, MONTH_NAMES);

    // Jan at index 0, Feb at index 1 (diff=1 < 2, so skipped), Mar at index 2 (diff from 0 = 2, placed)
    expect(labels).toEqual([
      { weekIdx: 0, label: 'Jan' },
      { weekIdx: 2, label: 'Mar' },
    ]);
  });

  it('places a label on the first week', () => {
    const weeks: (string | null)[][] = [
      [
        '2026-04-05',
        '2026-04-06',
        '2026-04-07',
        '2026-04-08',
        '2026-04-09',
        '2026-04-10',
        '2026-04-11',
      ],
    ];
    const labels = getMonthLabelsForWeeks(weeks, MONTH_NAMES);
    expect(labels).toEqual([{ weekIdx: 0, label: 'Apr' }]);
  });

  it('returns an empty array for an empty weeks array', () => {
    const labels = getMonthLabelsForWeeks([], MONTH_NAMES);
    expect(labels).toEqual([]);
  });

  it('skips weeks that contain only null values', () => {
    const weeks: (string | null)[][] = [
      [null, null, null, null, null, null, null],
      [
        '2026-03-08',
        '2026-03-09',
        '2026-03-10',
        '2026-03-11',
        '2026-03-12',
        '2026-03-13',
        '2026-03-14',
      ],
    ];
    const labels = getMonthLabelsForWeeks(weeks, MONTH_NAMES);
    // The all-null week is skipped; label appears at weekIdx 1
    expect(labels).toEqual([{ weekIdx: 1, label: 'Mar' }]);
  });

  it('handles weeks with mixed null and date values (partial weeks)', () => {
    const weeks: (string | null)[][] = [
      [null, null, null, null, null, '2026-06-05', '2026-06-06'],
      [
        '2026-06-07',
        '2026-06-08',
        '2026-06-09',
        '2026-06-10',
        '2026-06-11',
        '2026-06-12',
        '2026-06-13',
      ],
    ];
    const labels = getMonthLabelsForWeeks(weeks, MONTH_NAMES);
    // Both weeks are in June, so only one label at weekIdx 0
    expect(labels).toEqual([{ weekIdx: 0, label: 'Jun' }]);
  });

  it('generates labels across a full year of weeks', () => {
    // Build 53 weeks of data starting from a Sunday
    const allDates = generateDateRange(new Date(2025, 3, 6), new Date(2026, 3, 8));
    const weeks = buildWeeks(allDates);
    const labels = getMonthLabelsForWeeks(weeks, MONTH_NAMES);
    // Should have labels for multiple months (at least 10 given spacing constraints)
    expect(labels.length).toBeGreaterThanOrEqual(10);
    // All labels should reference valid month names
    expect(labels.every((l) => MONTH_NAMES.includes(l.label))).toBe(true);
    // weekIdx values should be strictly increasing
    for (let i = 1; i < labels.length; i++) {
      expect(labels[i].weekIdx).toBeGreaterThan(labels[i - 1].weekIdx);
    }
  });

  it('handles all weeks in the same month (no month changes)', () => {
    const weeks: (string | null)[][] = [
      [
        '2026-04-05',
        '2026-04-06',
        '2026-04-07',
        '2026-04-08',
        '2026-04-09',
        '2026-04-10',
        '2026-04-11',
      ],
      [
        '2026-04-12',
        '2026-04-13',
        '2026-04-14',
        '2026-04-15',
        '2026-04-16',
        '2026-04-17',
        '2026-04-18',
      ],
      [
        '2026-04-19',
        '2026-04-20',
        '2026-04-21',
        '2026-04-22',
        '2026-04-23',
        '2026-04-24',
        '2026-04-25',
      ],
    ];
    const labels = getMonthLabelsForWeeks(weeks, MONTH_NAMES);
    // Only one label at the first week
    expect(labels).toEqual([{ weekIdx: 0, label: 'Apr' }]);
  });

  it('handles year boundary (December to January)', () => {
    const allDates = generateDateRange(new Date(2025, 11, 21), new Date(2026, 0, 17));
    const weeks = buildWeeks(allDates);
    const labels = getMonthLabelsForWeeks(weeks, MONTH_NAMES);
    const decLabel = labels.find((l) => l.label === 'Dec');
    const janLabel = labels.find((l) => l.label === 'Jan');
    expect(decLabel).toBeDefined();
    expect(janLabel).toBeDefined();
    expect(janLabel!.weekIdx).toBeGreaterThan(decLabel!.weekIdx);
  });
});
