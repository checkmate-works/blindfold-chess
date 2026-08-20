import { describe, expect, it } from 'vitest';

import { startOfCurrentMonth, startOfCurrentWeek, startOfUtcDay } from './period-range';

/** Every case pins the reference instant — no system-clock manipulation. */
const at = (iso: string) => new Date(iso);

describe('startOfUtcDay', () => {
  it('truncates the time of day in UTC', () => {
    expect(startOfUtcDay(at('2026-05-18T13:45:12.345Z')).toISOString()).toBe(
      '2026-05-18T00:00:00.000Z'
    );
  });

  it('is idempotent on a value already at midnight', () => {
    const midnight = at('2026-05-18T00:00:00.000Z');
    expect(startOfUtcDay(midnight).toISOString()).toBe(midnight.toISOString());
  });

  it('uses the UTC date, not the local one, just before midnight UTC', () => {
    expect(startOfUtcDay(at('2026-05-18T23:59:59.999Z')).toISOString()).toBe(
      '2026-05-18T00:00:00.000Z'
    );
  });
});

describe('startOfCurrentWeek', () => {
  it.each([
    ['Monday', '2026-05-18T10:00:00.000Z'],
    ['Tuesday', '2026-05-19T10:00:00.000Z'],
    ['Saturday', '2026-05-23T10:00:00.000Z'],
  ])('returns the same Monday for a %s', (_day, iso) => {
    expect(startOfCurrentWeek(at(iso)).toISOString()).toBe('2026-05-18T00:00:00.000Z');
  });

  it('treats Sunday as the last day of the week, not the first', () => {
    // The `day === 0 ? 6 : day - 1` branch: Sunday 2026-05-24 belongs to the
    // week starting Monday 2026-05-18, not to the next one.
    expect(startOfCurrentWeek(at('2026-05-24T10:00:00.000Z')).toISOString()).toBe(
      '2026-05-18T00:00:00.000Z'
    );
  });

  it('crosses a month boundary backwards', () => {
    expect(startOfCurrentWeek(at('2026-06-02T10:00:00.000Z')).toISOString()).toBe(
      '2026-06-01T00:00:00.000Z'
    );
    expect(startOfCurrentWeek(at('2026-03-01T10:00:00.000Z')).toISOString()).toBe(
      '2026-02-23T00:00:00.000Z'
    );
  });
});

describe('startOfCurrentMonth', () => {
  it('returns the first of the month at midnight UTC', () => {
    expect(startOfCurrentMonth(at('2026-05-18T13:45:00.000Z')).toISOString()).toBe(
      '2026-05-01T00:00:00.000Z'
    );
  });

  it('handles January and a leap February', () => {
    expect(startOfCurrentMonth(at('2026-01-31T23:00:00.000Z')).toISOString()).toBe(
      '2026-01-01T00:00:00.000Z'
    );
    expect(startOfCurrentMonth(at('2028-02-29T12:00:00.000Z')).toISOString()).toBe(
      '2028-02-01T00:00:00.000Z'
    );
  });
});
