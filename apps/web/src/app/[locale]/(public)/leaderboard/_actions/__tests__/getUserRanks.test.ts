import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LeaderboardPeriod } from '../../_lib/types';
import { ALL_LEADERBOARD_ENTRIES } from '../../_lib/types';

// ---------------------------------------------------------------------------
// Mock the DB query functions
// ---------------------------------------------------------------------------

const mockGetUserAllTimeRank = vi.fn();
const mockGetUserWeeklyRank = vi.fn();
const mockGetUserMonthlyRank = vi.fn();

vi.mock('@/lib/db/challenge-queries', () => ({
  getUserAllTimeRank: (...args: unknown[]) => mockGetUserAllTimeRank(...args),
  getUserWeeklyRank: (...args: unknown[]) => mockGetUserWeeklyRank(...args),
  getUserMonthlyRank: (...args: unknown[]) => mockGetUserMonthlyRank(...args),
}));

// Import after mock setup
const { getUserRanks } = await import('../getUserRanks');

const TEST_USER_ID = 'test-user-id-123';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function setAllRankResults(
  mockFn: ReturnType<typeof vi.fn>,
  resultMap: Record<string, { rank: number } | null>
) {
  mockFn.mockImplementation((_userId: string, menuType: string, leaderboardKey: string) => {
    const lookupKey = `${menuType}:${leaderboardKey}`;
    return Promise.resolve(resultMap[lookupKey] ?? null);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getUserRanks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('period routing', () => {
    it('uses getUserAllTimeRank for all-time period', async () => {
      mockGetUserAllTimeRank.mockResolvedValue(null);
      mockGetUserWeeklyRank.mockResolvedValue(null);
      mockGetUserMonthlyRank.mockResolvedValue(null);

      await getUserRanks(TEST_USER_ID, 'all-time');

      expect(mockGetUserAllTimeRank).toHaveBeenCalled();
      expect(mockGetUserWeeklyRank).not.toHaveBeenCalled();
      expect(mockGetUserMonthlyRank).not.toHaveBeenCalled();
    });

    it('uses getUserWeeklyRank for weekly period', async () => {
      mockGetUserAllTimeRank.mockResolvedValue(null);
      mockGetUserWeeklyRank.mockResolvedValue(null);
      mockGetUserMonthlyRank.mockResolvedValue(null);

      await getUserRanks(TEST_USER_ID, 'weekly');

      expect(mockGetUserAllTimeRank).not.toHaveBeenCalled();
      expect(mockGetUserWeeklyRank).toHaveBeenCalled();
      expect(mockGetUserMonthlyRank).not.toHaveBeenCalled();
    });

    it('uses getUserMonthlyRank for monthly period', async () => {
      mockGetUserAllTimeRank.mockResolvedValue(null);
      mockGetUserWeeklyRank.mockResolvedValue(null);
      mockGetUserMonthlyRank.mockResolvedValue(null);

      await getUserRanks(TEST_USER_ID, 'monthly');

      expect(mockGetUserAllTimeRank).not.toHaveBeenCalled();
      expect(mockGetUserWeeklyRank).not.toHaveBeenCalled();
      expect(mockGetUserMonthlyRank).toHaveBeenCalled();
    });
  });

  describe('querying all leaderboard entries', () => {
    it('queries all 10 leaderboard entries', async () => {
      mockGetUserAllTimeRank.mockResolvedValue(null);

      await getUserRanks(TEST_USER_ID, 'all-time');

      expect(mockGetUserAllTimeRank).toHaveBeenCalledTimes(ALL_LEADERBOARD_ENTRIES.length);
      expect(mockGetUserAllTimeRank).toHaveBeenCalledTimes(10);
    });

    it('passes correct userId, module, and key to rank function', async () => {
      mockGetUserAllTimeRank.mockResolvedValue(null);

      await getUserRanks(TEST_USER_ID, 'all-time');

      for (const entry of ALL_LEADERBOARD_ENTRIES) {
        expect(mockGetUserAllTimeRank).toHaveBeenCalledWith(TEST_USER_ID, entry.module, entry.key);
      }
    });
  });

  describe('no ranks (user has no data)', () => {
    it('returns empty array when user has no ranks in any leaderboard', async () => {
      mockGetUserAllTimeRank.mockResolvedValue(null);

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      expect(result).toEqual([]);
    });
  });

  describe('partial ranks', () => {
    it('returns only entries where user has a rank', async () => {
      setAllRankResults(mockGetUserAllTimeRank, {
        'coordinate_quiz:white': { rank: 5 },
        'legal_moves:knight': { rank: 42 },
      });

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        module: 'coordinate_quiz',
        key: 'white',
        rank: 5,
      });
      expect(result).toContainEqual({
        module: 'legal_moves',
        key: 'knight',
        rank: 42,
      });
    });

    it('returns single entry when user ranks in only one leaderboard', async () => {
      setAllRankResults(mockGetUserAllTimeRank, {
        'square_colors:default': { rank: 1 },
      });

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        module: 'square_colors',
        key: 'default',
        rank: 1,
      });
    });
  });

  describe('all ranks present', () => {
    it('returns all 10 entries when user ranks in every leaderboard', async () => {
      const allResults: Record<string, { rank: number }> = {};
      let rankCounter = 1;
      for (const entry of ALL_LEADERBOARD_ENTRIES) {
        allResults[`${entry.module}:${entry.key}`] = { rank: rankCounter++ };
      }
      setAllRankResults(mockGetUserAllTimeRank, allResults);

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      expect(result).toHaveLength(10);
    });
  });

  describe('rank values', () => {
    it('preserves the rank value from the DB function', async () => {
      setAllRankResults(mockGetUserWeeklyRank, {
        'coordinate_quiz:random': { rank: 99 },
      });

      const result = await getUserRanks(TEST_USER_ID, 'weekly');

      expect(result).toHaveLength(1);
      expect(result[0]!.rank).toBe(99);
    });

    it('handles rank of 1 (top rank)', async () => {
      setAllRankResults(mockGetUserMonthlyRank, {
        'legal_moves:queen': { rank: 1 },
      });

      const result = await getUserRanks(TEST_USER_ID, 'monthly');

      expect(result[0]!.rank).toBe(1);
    });

    it('handles large rank values', async () => {
      setAllRankResults(mockGetUserAllTimeRank, {
        'coordinate_quiz:black': { rank: 10000 },
      });

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      expect(result[0]!.rank).toBe(10000);
    });
  });

  describe('all periods work consistently', () => {
    const periods: LeaderboardPeriod[] = ['all-time', 'weekly', 'monthly'];

    it.each(periods)('returns results for period: %s', async (period) => {
      const mockFns: Record<LeaderboardPeriod, ReturnType<typeof vi.fn>> = {
        'all-time': mockGetUserAllTimeRank,
        weekly: mockGetUserWeeklyRank,
        monthly: mockGetUserMonthlyRank,
      };
      const mockFn = mockFns[period];
      setAllRankResults(mockFn, {
        'coordinate_quiz:white': { rank: 10 },
      });

      const result = await getUserRanks(TEST_USER_ID, period);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        module: 'coordinate_quiz',
        key: 'white',
        rank: 10,
      });
    });
  });
});
