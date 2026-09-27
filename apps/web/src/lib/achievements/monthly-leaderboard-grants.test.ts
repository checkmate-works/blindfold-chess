import { describe, expect, it } from 'vitest';

import {
  getMonthRange,
  getPreviousMonth,
  groupGrantedBadgesByUser,
  monthlyGrantNotificationGroupKey,
} from './monthly-leaderboard-grants';

describe('getPreviousMonth', () => {
  it('returns the previous month of the same year', () => {
    expect(getPreviousMonth(new Date('2026-06-01T00:00:00Z'))).toEqual({ year: 2026, month: 5 });
  });

  it('rolls January back to December of the previous year', () => {
    expect(getPreviousMonth(new Date('2026-01-01T00:05:00Z'))).toEqual({ year: 2025, month: 12 });
  });

  it('uses the UTC month, not the local one', () => {
    // 2026-03-01 08:00 in UTC+9 is still February in UTC.
    expect(getPreviousMonth(new Date('2026-02-28T23:00:00Z'))).toEqual({ year: 2026, month: 1 });
  });
});

describe('getMonthRange', () => {
  it('spans the first of the month to the first of the next', () => {
    expect(getMonthRange(2026, 2)).toEqual({
      start: new Date('2026-02-01T00:00:00Z'),
      end: new Date('2026-03-01T00:00:00Z'),
    });
  });

  it('ends December at the next year’s January', () => {
    expect(getMonthRange(2025, 12).end).toEqual(new Date('2026-01-01T00:00:00Z'));
  });
});

describe('groupGrantedBadgesByUser', () => {
  const badge = (slug: string) => ({ slug, menuType: 'm', leaderboardKey: 'k', placement: 1 });

  it('gives each user one list of their badges in grant order', () => {
    const grouped = groupGrantedBadgesByUser([
      { userId: 'a', info: badge('gold-x') },
      { userId: 'b', info: badge('silver-x') },
      { userId: 'a', info: badge('gold-y') },
    ]);
    expect(grouped).toEqual(
      new Map([
        ['a', [badge('gold-x'), badge('gold-y')]],
        ['b', [badge('silver-x')]],
      ])
    );
  });

  it('is empty when nothing was granted', () => {
    expect(groupGrantedBadgesByUser([]).size).toBe(0);
  });
});

describe('monthlyGrantNotificationGroupKey', () => {
  it('keys by user and month', () => {
    expect(monthlyGrantNotificationGroupKey('u1', 2026, 5)).toBe('achievement-monthly-u1-2026-5');
  });
});
