import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type DatePeriod,
  getMondayOfWeek,
  getPeriodRange,
  getPreviousPeriodRange,
} from './period-utils';

describe('getMondayOfWeek', () => {
  it('returns the same day when given a Monday', () => {
    // 2025-06-02 is a Monday
    const monday = new Date(2025, 5, 2, 10, 30, 0);
    const result = getMondayOfWeek(monday);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(2);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('returns Monday when given a Wednesday', () => {
    // 2025-06-04 is a Wednesday
    const wednesday = new Date(2025, 5, 4, 14, 0, 0);
    const result = getMondayOfWeek(wednesday);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(2);
  });

  it('returns Monday when given a Sunday', () => {
    // 2025-06-08 is a Sunday -> Monday is 2025-06-02
    const sunday = new Date(2025, 5, 8, 23, 59, 59);
    const result = getMondayOfWeek(sunday);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(2);
  });

  it('returns Monday when given a Saturday', () => {
    // 2025-06-07 is a Saturday -> Monday is 2025-06-02
    const saturday = new Date(2025, 5, 7);
    const result = getMondayOfWeek(saturday);
    expect(result.getDate()).toBe(2);
  });

  it('returns Monday when given a Friday', () => {
    // 2025-06-06 is a Friday -> Monday is 2025-06-02
    const friday = new Date(2025, 5, 6);
    const result = getMondayOfWeek(friday);
    expect(result.getDate()).toBe(2);
  });

  it('resets time to midnight', () => {
    const date = new Date(2025, 5, 4, 15, 30, 45, 123);
    const result = getMondayOfWeek(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('does not mutate the input date', () => {
    const original = new Date(2025, 5, 5, 12, 0, 0);
    const originalTime = original.getTime();
    getMondayOfWeek(original);
    expect(original.getTime()).toBe(originalTime);
  });

  it('handles year boundary (Jan 1, 2025 is Wednesday -> Monday is Dec 29, 2024)', () => {
    const jan1 = new Date(2025, 0, 1);
    const result = getMondayOfWeek(jan1);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(11); // December
    expect(result.getDate()).toBe(30);
  });

  it('handles year boundary (Jan 1, 2024 is Monday)', () => {
    const jan1 = new Date(2024, 0, 1);
    const result = getMondayOfWeek(jan1);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
  });
});

describe('getPeriodRange', () => {
  beforeEach(() => {
    // Fix "now" to Wednesday 2025-06-04 12:00:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 4, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('thisWeek returns Monday to end of today (exclusive)', () => {
    const { start, end } = getPeriodRange('thisWeek');
    // Monday = 2025-06-02
    expect(start).toEqual(new Date(2025, 5, 2, 0, 0, 0, 0));
    // end of today (exclusive) = 2025-06-05 00:00
    expect(end).toEqual(new Date(2025, 5, 5));
  });

  it('lastWeek returns previous Monday to this Monday', () => {
    const { start, end } = getPeriodRange('lastWeek');
    // Previous Monday = 2025-05-26
    expect(start).toEqual(new Date(2025, 4, 26, 0, 0, 0, 0));
    // This Monday = 2025-06-02
    expect(end).toEqual(new Date(2025, 5, 2, 0, 0, 0, 0));
  });

  it('thisMonth returns first of month to end of today', () => {
    const { start, end } = getPeriodRange('thisMonth');
    expect(start).toEqual(new Date(2025, 5, 1));
    expect(end).toEqual(new Date(2025, 5, 5));
  });

  it('lastMonth returns first of last month to first of this month', () => {
    const { start, end } = getPeriodRange('lastMonth');
    expect(start).toEqual(new Date(2025, 4, 1));
    expect(end).toEqual(new Date(2025, 5, 1));
  });
});

describe('getPeriodRange at year boundary', () => {
  beforeEach(() => {
    // Fix "now" to Wednesday 2025-01-01
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('thisWeek crosses year boundary correctly', () => {
    const { start, end } = getPeriodRange('thisWeek');
    // Jan 1, 2025 is Wednesday -> Monday is Dec 30, 2024
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(11);
    expect(start.getDate()).toBe(30);
    expect(end).toEqual(new Date(2025, 0, 2));
  });

  it('lastMonth returns December of previous year', () => {
    const { start, end } = getPeriodRange('lastMonth');
    expect(start).toEqual(new Date(2024, 11, 1));
    expect(end).toEqual(new Date(2025, 0, 1));
  });
});

describe('getPreviousPeriodRange', () => {
  beforeEach(() => {
    // Fix "now" to Wednesday 2025-06-04 12:00:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 4, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('thisWeek returns lastWeek range', () => {
    const prev = getPreviousPeriodRange('thisWeek');
    const lastWeek = getPeriodRange('lastWeek');
    expect(prev).toEqual(lastWeek);
  });

  it('lastWeek returns 2 weeks ago', () => {
    const { start, end } = getPreviousPeriodRange('lastWeek');
    // This Monday = 2025-06-02
    // 2 weeks ago Monday = 2025-05-19
    // Last Monday = 2025-05-26
    expect(start).toEqual(new Date(2025, 4, 19, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2025, 4, 26, 0, 0, 0, 0));
  });

  it('thisMonth returns lastMonth range', () => {
    const prev = getPreviousPeriodRange('thisMonth');
    const lastMonth = getPeriodRange('lastMonth');
    expect(prev).toEqual(lastMonth);
  });

  it('lastMonth returns 2 months ago', () => {
    const { start, end } = getPreviousPeriodRange('lastMonth');
    // 2 months ago = April 2025
    expect(start).toEqual(new Date(2025, 3, 1));
    expect(end).toEqual(new Date(2025, 4, 1));
  });

  it('all periods return valid ranges (start < end)', () => {
    const periods: DatePeriod[] = ['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'];
    for (const period of periods) {
      const { start, end } = getPreviousPeriodRange(period);
      expect(start.getTime()).toBeLessThan(end.getTime());
    }
  });
});

describe('getPreviousPeriodRange at year boundary', () => {
  beforeEach(() => {
    // Fix "now" to Jan 15, 2025
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lastMonth returns November-December when current month is January', () => {
    // lastMonth = December 2024, previous of that = November 2024
    const { start, end } = getPreviousPeriodRange('lastMonth');
    expect(start).toEqual(new Date(2024, 10, 1)); // Nov 1, 2024
    expect(end).toEqual(new Date(2024, 11, 1)); // Dec 1, 2024
  });
});
