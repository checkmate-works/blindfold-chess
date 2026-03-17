import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { daysAgo, today } from './date-utils';

describe('today', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return current date in YYYY-MM-DD format', () => {
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'));
    expect(today()).toBe('2026-03-16');
  });

  it('should pad single-digit month and day', () => {
    vi.setSystemTime(new Date('2026-01-05T00:00:00Z'));
    expect(today()).toBe('2026-01-05');
  });

  it('should handle year boundary (Dec 31)', () => {
    vi.setSystemTime(new Date('2025-12-31T23:59:59Z'));
    expect(today()).toBe('2025-12-31');
  });

  it('should handle New Year (Jan 1)', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    expect(today()).toBe('2026-01-01');
  });
});

describe('daysAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return today when days=1', () => {
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'));
    expect(daysAgo(1)).toBe('2026-03-16');
  });

  it('should return 7 days ago (inclusive) for days=7', () => {
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'));
    // 7 days inclusive means start = today - 6 = Mar 10
    expect(daysAgo(7)).toBe('2026-03-10');
  });

  it('should return 28 days ago (inclusive) for days=28', () => {
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'));
    // 28 days inclusive means start = today - 27 = Feb 17
    expect(daysAgo(28)).toBe('2026-02-17');
  });

  it('should return 90 days ago (inclusive) for days=90', () => {
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'));
    // 90 days inclusive means start = today - 89 = Dec 17
    expect(daysAgo(90)).toBe('2025-12-17');
  });

  it('should handle month boundary crossing', () => {
    vi.setSystemTime(new Date('2026-03-03T12:00:00Z'));
    expect(daysAgo(7)).toBe('2026-02-25');
  });

  it('should handle leap year (Feb 29)', () => {
    vi.setSystemTime(new Date('2024-03-05T12:00:00Z'));
    // 7 days inclusive: Mar 5 - 6 = Feb 28; but 2024 is leap year
    expect(daysAgo(7)).toBe('2024-02-28');
  });

  it('should return tomorrow when days=0 (edge case: -days+1 = +1)', () => {
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'));
    // 0 days: d.setDate(d.getDate() - 0 + 1) = tomorrow
    expect(daysAgo(0)).toBe('2026-03-17');
  });

  it('should return a future date when days is negative', () => {
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'));
    // -1 days: d.setDate(d.getDate() - (-1) + 1) = +2 = Mar 18
    expect(daysAgo(-1)).toBe('2026-03-18');
  });

  it('should handle very large values (days=365)', () => {
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'));
    // 365 days inclusive: today - 364
    expect(daysAgo(365)).toBe('2025-03-17');
  });

  it('should handle year boundary when going back across years', () => {
    vi.setSystemTime(new Date('2026-01-03T12:00:00Z'));
    // 7 days inclusive: Jan 3 - 6 = Dec 28, 2025
    expect(daysAgo(7)).toBe('2025-12-28');
  });

  it('should handle Feb 29 in leap year when current date is on Feb 29', () => {
    vi.setSystemTime(new Date('2024-02-29T12:00:00Z'));
    expect(daysAgo(1)).toBe('2024-02-29');
  });

  it('should handle Feb 29 in leap year going back to Feb 29', () => {
    vi.setSystemTime(new Date('2024-03-01T12:00:00Z'));
    // 2 days inclusive: Mar 1 - 1 = Feb 29 (leap year)
    expect(daysAgo(2)).toBe('2024-02-29');
  });

  it('should use UTC date, not local TZ (T23:00:00Z is next day in UTC+9)', () => {
    // 2026-03-16T23:00:00Z is still March 16 in UTC,
    // but would be 2026-03-17 08:00 in UTC+9 (JST)
    vi.setSystemTime(new Date('2026-03-16T23:00:00Z'));
    expect(daysAgo(1)).toBe('2026-03-16');
  });

  it('should use UTC date at midnight boundary', () => {
    // At exactly midnight UTC on March 17, daysAgo(1) should return March 17
    vi.setSystemTime(new Date('2026-03-17T00:00:00Z'));
    expect(daysAgo(1)).toBe('2026-03-17');
  });

  it('should compute range start in UTC when near day boundary', () => {
    // 2026-03-16T23:00:00Z → UTC date is March 16
    // daysAgo(7) inclusive: March 16 - 6 = March 10
    vi.setSystemTime(new Date('2026-03-16T23:00:00Z'));
    expect(daysAgo(7)).toBe('2026-03-10');
  });

  it('should handle year boundary crossing near UTC midnight (23:59)', () => {
    // 2026-01-01T23:59:59Z → UTC date is Jan 1, 2026
    // daysAgo(7) inclusive: Jan 1 - 6 = Dec 26, 2025
    vi.setSystemTime(new Date('2026-01-01T23:59:59Z'));
    expect(daysAgo(7)).toBe('2025-12-26');
  });

  it('should handle year boundary crossing at UTC midnight (00:00)', () => {
    // 2026-01-01T00:00:01Z → UTC date is Jan 1, 2026
    // daysAgo(7) inclusive: Jan 1 - 6 = Dec 26, 2025
    vi.setSystemTime(new Date('2026-01-01T00:00:01Z'));
    expect(daysAgo(7)).toBe('2025-12-26');
  });

  it('should handle month boundary crossing near UTC midnight (23:59)', () => {
    // 2026-03-01T23:59:59Z → UTC date is Mar 1, 2026
    // daysAgo(7) inclusive: Mar 1 - 6 = Feb 23, 2026
    vi.setSystemTime(new Date('2026-03-01T23:59:59Z'));
    expect(daysAgo(7)).toBe('2026-02-23');
  });

  it('should handle month boundary crossing at UTC midnight (00:00)', () => {
    // 2026-03-01T00:00:01Z → UTC date is Mar 1, 2026
    // daysAgo(7) inclusive: Mar 1 - 6 = Feb 23, 2026
    vi.setSystemTime(new Date('2026-03-01T00:00:01Z'));
    expect(daysAgo(7)).toBe('2026-02-23');
  });
});

describe('today - UTC behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return UTC date (toISOString always uses UTC)', () => {
    // At midnight UTC, toISOString returns the same date
    vi.setSystemTime(new Date('2026-03-16T00:00:00Z'));
    expect(today()).toBe('2026-03-16');
  });

  it('should return UTC date even at end of day', () => {
    vi.setSystemTime(new Date('2026-03-16T23:59:59.999Z'));
    expect(today()).toBe('2026-03-16');
  });
});
