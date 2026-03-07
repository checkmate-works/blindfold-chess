import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatRelativeTime } from './relative-time';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const justNowLabel = 'just now';

  describe('just now (< 60 seconds)', () => {
    it('returns justNowLabel for 0 seconds ago', () => {
      const date = new Date('2025-06-15T12:00:00Z');
      expect(formatRelativeTime(date, 'en', justNowLabel)).toBe('just now');
    });

    it('returns justNowLabel for 30 seconds ago', () => {
      const date = new Date('2025-06-15T11:59:30Z');
      expect(formatRelativeTime(date, 'en', justNowLabel)).toBe('just now');
    });

    it('returns justNowLabel for 59 seconds ago', () => {
      const date = new Date('2025-06-15T11:59:01Z');
      expect(formatRelativeTime(date, 'en', justNowLabel)).toBe('just now');
    });
  });

  describe('minutes (1-59 minutes)', () => {
    it('returns minutes for exactly 1 minute ago', () => {
      const date = new Date('2025-06-15T11:59:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('1');
      expect(result).toContain('minute');
    });

    it('returns minutes for 30 minutes ago', () => {
      const date = new Date('2025-06-15T11:30:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('30');
      expect(result).toContain('minute');
    });

    it('returns minutes for 59 minutes ago', () => {
      const date = new Date('2025-06-15T11:01:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('59');
      expect(result).toContain('minute');
    });
  });

  describe('hours (1-23 hours)', () => {
    it('returns hours for exactly 1 hour ago', () => {
      const date = new Date('2025-06-15T11:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('1');
      expect(result).toContain('hour');
    });

    it('returns hours for 12 hours ago', () => {
      const date = new Date('2025-06-15T00:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('12');
      expect(result).toContain('hour');
    });

    it('returns hours for 23 hours ago', () => {
      const date = new Date('2025-06-14T13:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('23');
      expect(result).toContain('hour');
    });
  });

  describe('days (1-29 days)', () => {
    it('returns days for exactly 1 day ago', () => {
      const date = new Date('2025-06-14T12:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('1');
      expect(result).toContain('day');
    });

    it('returns days for 15 days ago', () => {
      const date = new Date('2025-05-31T12:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('15');
      expect(result).toContain('day');
    });

    it('returns days for 29 days ago', () => {
      const date = new Date('2025-05-17T12:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('29');
      expect(result).toContain('day');
    });
  });

  describe('months (1-11 months)', () => {
    it('returns months for 30 days ago (1 month)', () => {
      const date = new Date('2025-05-16T12:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('1');
      expect(result).toContain('month');
    });

    it('returns months for ~6 months ago', () => {
      const date = new Date('2024-12-15T12:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      // 182 days / 30 = 6 months
      expect(result).toContain('6');
      expect(result).toContain('month');
    });

    it('returns months for 11 months ago', () => {
      // 330 days ago => 11 months (330 / 30 = 11)
      const date = new Date('2024-07-20T12:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('11');
      expect(result).toContain('month');
    });
  });

  describe('years (12+ months)', () => {
    it('returns years for 1 year ago', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('1');
      expect(result).toContain('year');
    });

    it('returns years for 2 years ago', () => {
      const date = new Date('2023-06-15T12:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('2');
      expect(result).toContain('year');
    });
  });

  describe('locale support', () => {
    it('formats in English', () => {
      const date = new Date('2025-06-15T11:55:00Z');
      const result = formatRelativeTime(date, 'en', 'just now');
      expect(result).toContain('5');
      expect(result).toContain('minute');
    });

    it('formats in Japanese', () => {
      const date = new Date('2025-06-15T11:55:00Z');
      const result = formatRelativeTime(date, 'ja', 'たった今');
      expect(result).toContain('5');
      // Japanese uses "分前" for minutes ago
      expect(result).toMatch(/分/);
    });

    it('returns the provided justNowLabel for Japanese locale', () => {
      const date = new Date('2025-06-15T12:00:00Z');
      expect(formatRelativeTime(date, 'ja', 'たった今')).toBe('たった今');
    });
  });

  describe('boundary transitions', () => {
    it('transitions from justNow to minutes at exactly 60 seconds', () => {
      const date = new Date('2025-06-15T11:59:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).not.toBe('just now');
      expect(result).toContain('minute');
    });

    it('transitions from minutes to hours at exactly 60 minutes', () => {
      const date = new Date('2025-06-15T11:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('hour');
      expect(result).not.toContain('minute');
    });

    it('transitions from hours to days at exactly 24 hours', () => {
      const date = new Date('2025-06-14T12:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('day');
      expect(result).not.toContain('hour');
    });

    it('transitions from days to months at exactly 30 days', () => {
      const date = new Date('2025-05-16T12:00:00Z');
      const result = formatRelativeTime(date, 'en', justNowLabel);
      expect(result).toContain('month');
      expect(result).not.toContain('day');
    });
  });
});
