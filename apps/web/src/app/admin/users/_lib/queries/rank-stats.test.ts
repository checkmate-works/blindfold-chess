import { describe, expect, it } from 'vitest';

import { ALL_RANK_SLUGS, MUKYU_SLUG } from '@/lib/db/data/ranks';
import type { Rank } from '@/lib/db/schema';

import { makeAuthUser } from '../__test-helpers__/admin-users-mocks';
import { type RankStatsContext, aggregateRankStats } from './rank-stats';

describe('aggregateRankStats', () => {
  const emptyCtx: RankStatsContext = {
    rankById: new Map<string, Rank>(),
    userSlugs: new Map<string, Set<string>>(),
  };

  it('returns all ranks in ALL_RANK_SLUGS order', () => {
    const result = aggregateRankStats([], emptyCtx);
    expect(result.map((r) => r.slug).sort()).toEqual([...ALL_RANK_SLUGS].sort());
  });

  it('counts all users as mukyu when no ranks are held', () => {
    const users = [makeAuthUser({ id: 'a' }), makeAuthUser({ id: 'b' }), makeAuthUser({ id: 'c' })];
    const result = aggregateRankStats(users, emptyCtx);
    const mukyuRow = result.find((r) => r.slug === MUKYU_SLUG);
    expect(mukyuRow?.count).toBe(3);
  });

  it('subtracts ranked users from the mukyu count', () => {
    const users = [makeAuthUser({ id: 'a' }), makeAuthUser({ id: 'b' }), makeAuthUser({ id: 'c' })];
    const firstRealRank = ALL_RANK_SLUGS.find((s) => s !== MUKYU_SLUG)!;
    const ctx: RankStatsContext = {
      rankById: new Map<string, Rank>(),
      userSlugs: new Map<string, Set<string>>([['a', new Set([firstRealRank])]]),
    };
    const result = aggregateRankStats(users, ctx);
    expect(result.find((r) => r.slug === MUKYU_SLUG)?.count).toBe(2);
    expect(result.find((r) => r.slug === firstRealRank)?.count).toBe(1);
  });

  it('counts a user only at their highest rank, not every rank they hold', () => {
    // Ranks are granted idempotently along a linear path, so a user who
    // reached the third rank holds rows for all ranks up to it.
    const realRanks = ALL_RANK_SLUGS.filter((s) => s !== MUKYU_SLUG);
    const [first, second, third] = realRanks;
    const users = [makeAuthUser({ id: 'a' })];
    const ctx: RankStatsContext = {
      rankById: new Map<string, Rank>(),
      userSlugs: new Map<string, Set<string>>([['a', new Set([first, second, third])]]),
    };
    const result = aggregateRankStats(users, ctx);
    expect(result.find((r) => r.slug === first)?.count).toBe(0);
    expect(result.find((r) => r.slug === second)?.count).toBe(0);
    expect(result.find((r) => r.slug === third)?.count).toBe(1);
    expect(result.find((r) => r.slug === MUKYU_SLUG)?.count).toBe(0);
  });

  it('sorts by level ascending (mukyu first)', () => {
    const result = aggregateRankStats([], emptyCtx);
    expect(result[0].slug).toBe(MUKYU_SLUG);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].level).toBeGreaterThanOrEqual(result[i - 1].level);
    }
  });
});
