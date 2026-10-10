import { getExpForLevel } from '@blindfold-chess/features/exp';
import { describe, expect, it } from 'vitest';

import { makeAuthUser } from '../__test-helpers__/admin-users-mocks';
import {
  LEVEL_BUCKET_ORDER,
  NO_EXP_BUCKET,
  aggregateLevelStats,
  isLevelBucket,
  resolveLevelBucket,
} from './level-stats';

describe('resolveLevelBucket', () => {
  it('puts users without a user_exp row in the no-exp bucket', () => {
    expect(resolveLevelBucket(undefined)).toBe(NO_EXP_BUCKET);
  });

  it('puts a row with under 100 Exp in the Lv0 band, not the no-exp bucket', () => {
    expect(resolveLevelBucket(0)).toBe('0');
    expect(resolveLevelBucket(99)).toBe('0');
  });

  it('maps cumulative Exp through the level curve into a band', () => {
    expect(resolveLevelBucket(getExpForLevel(1))).toBe('1-4');
    expect(resolveLevelBucket(getExpForLevel(5))).toBe('5-9');
    expect(resolveLevelBucket(getExpForLevel(10))).toBe('10-19');
    expect(resolveLevelBucket(getExpForLevel(20))).toBe('20-49');
    expect(resolveLevelBucket(getExpForLevel(50))).toBe('50plus');
  });
});

describe('aggregateLevelStats', () => {
  it('returns every bucket in display order even when empty', () => {
    const result = aggregateLevelStats([], new Map());
    expect(result.map((r) => r.bucket)).toEqual([...LEVEL_BUCKET_ORDER]);
    expect(result.every((r) => r.count === 0)).toBe(true);
  });

  it('counts each user once in their bucket', () => {
    const users = [
      makeAuthUser({ id: 'a' }),
      makeAuthUser({ id: 'b' }),
      makeAuthUser({ id: 'c' }),
      makeAuthUser({ id: 'd' }),
    ];
    const exp = new Map<string, number>([
      ['a', 0],
      ['b', getExpForLevel(3)],
      ['c', getExpForLevel(4)],
    ]);
    const result = aggregateLevelStats(users, exp);
    const byBucket = Object.fromEntries(result.map((r) => [r.bucket, r.count]));
    expect(byBucket[NO_EXP_BUCKET]).toBe(1);
    expect(byBucket['0']).toBe(1);
    expect(byBucket['1-4']).toBe(2);
    expect(result.reduce((sum, r) => sum + r.count, 0)).toBe(users.length);
  });
});

describe('isLevelBucket', () => {
  it('accepts band ids and the no-exp bucket, rejects everything else', () => {
    expect(isLevelBucket(NO_EXP_BUCKET)).toBe(true);
    expect(isLevelBucket('1-4')).toBe(true);
    expect(isLevelBucket('')).toBe(false);
    expect(isLevelBucket('1')).toBe(false);
  });
});
