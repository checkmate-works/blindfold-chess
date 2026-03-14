import { describe, expect, it } from 'vitest';

import { formatDateTimeLocal } from './format';

describe('formatDateTimeLocal', () => {
  it('should return null when input is null', () => {
    expect(formatDateTimeLocal(null)).toBeNull();
  });

  it('should format a Date to datetime-local string', () => {
    const date = new Date(2024, 5, 15, 12, 30); // June 15, 2024 12:30
    expect(formatDateTimeLocal(date)).toBe('2024-06-15T12:30');
  });

  it('should pad single-digit months and days', () => {
    const date = new Date(2024, 0, 5, 9, 5); // January 5, 2024 09:05
    expect(formatDateTimeLocal(date)).toBe('2024-01-05T09:05');
  });

  it('should handle midnight correctly', () => {
    const date = new Date(2024, 11, 31, 0, 0); // December 31, 2024 00:00
    expect(formatDateTimeLocal(date)).toBe('2024-12-31T00:00');
  });

  it('should handle end of day (23:59)', () => {
    const date = new Date(2024, 5, 15, 23, 59);
    expect(formatDateTimeLocal(date)).toBe('2024-06-15T23:59');
  });

  it('should handle leap year date (Feb 29)', () => {
    const date = new Date(2024, 1, 29, 10, 0); // Feb 29, 2024 (leap year)
    expect(formatDateTimeLocal(date)).toBe('2024-02-29T10:00');
  });

  it('should handle year 2000 (Y2K boundary)', () => {
    const date = new Date(2000, 0, 1, 0, 0);
    expect(formatDateTimeLocal(date)).toBe('2000-01-01T00:00');
  });
});
