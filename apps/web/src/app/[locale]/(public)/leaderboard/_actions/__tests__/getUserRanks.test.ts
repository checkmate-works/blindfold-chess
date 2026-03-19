import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LeaderboardPeriod } from '../../_lib/types';
import { ALL_LEADERBOARD_ENTRIES } from '../../_lib/types';

// ---------------------------------------------------------------------------
// Mock the DB query functions
// ---------------------------------------------------------------------------

const mockGetUserAllTimeRank = vi.fn();
const mockGetUserWeeklyRank = vi.fn();
const mockGetUserMonthlyRank = vi.fn();
const mockGetAllTimeRanking = vi.fn();
const mockGetWeeklyRanking = vi.fn();
const mockGetMonthlyRanking = vi.fn();
const mockGetUserAllTimeRankedRow = vi.fn();
const mockGetUserWeeklyRankedRow = vi.fn();
const mockGetUserMonthlyRankedRow = vi.fn();

vi.mock('@/lib/db/challenge-queries', () => ({
  getUserAllTimeRank: (...args: unknown[]) => mockGetUserAllTimeRank(...args),
  getUserWeeklyRank: (...args: unknown[]) => mockGetUserWeeklyRank(...args),
  getUserMonthlyRank: (...args: unknown[]) => mockGetUserMonthlyRank(...args),
  getAllTimeRanking: (...args: unknown[]) => mockGetAllTimeRanking(...args),
  getWeeklyRanking: (...args: unknown[]) => mockGetWeeklyRanking(...args),
  getMonthlyRanking: (...args: unknown[]) => mockGetMonthlyRanking(...args),
  getUserAllTimeRankedRow: (...args: unknown[]) => mockGetUserAllTimeRankedRow(...args),
  getUserWeeklyRankedRow: (...args: unknown[]) => mockGetUserWeeklyRankedRow(...args),
  getUserMonthlyRankedRow: (...args: unknown[]) => mockGetUserMonthlyRankedRow(...args),
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

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('returns empty array when all DB queries throw', async () => {
      mockGetUserAllTimeRank.mockRejectedValue(new Error('DB connection failed'));

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      expect(result).toEqual([]);
    });

    it('returns successful results when some entries fail (partial failure)', async () => {
      // With Promise.allSettled, successful queries are preserved even when
      // some individual rank queries fail
      let callCount = 0;
      mockGetUserAllTimeRank.mockImplementation(() => {
        callCount++;
        if (callCount === 5) {
          return Promise.reject(new Error('Intermittent failure'));
        }
        return Promise.resolve({ rank: callCount });
      });

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      // 9 out of 10 queries succeed (callCount 5 is rejected)
      expect(result).toHaveLength(9);
    });

    it('filters out rejected entries while preserving fulfilled null results', async () => {
      // Simulate: 1st query returns rank, 2nd rejects, rest return null
      let callIndex = 0;
      mockGetUserAllTimeRank.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.resolve({ rank: 3 });
        }
        if (callIndex === 2) {
          return Promise.reject(new Error('Connection reset'));
        }
        return Promise.resolve(null);
      });

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      // Only 1 fulfilled non-null result
      expect(result).toHaveLength(1);
      expect(result[0]!.rank).toBe(3);
    });

    it('does not throw when all queries reject with different errors', async () => {
      let idx = 0;
      mockGetUserWeeklyRank.mockImplementation(() => {
        idx++;
        return Promise.reject(new Error(`Error #${idx}`));
      });

      const result = await getUserRanks(TEST_USER_ID, 'weekly');

      expect(result).toEqual([]);
    });

    it('handles mixed rejections and null results correctly', async () => {
      // Odd calls reject, even calls return null
      let count = 0;
      mockGetUserMonthlyRank.mockImplementation(() => {
        count++;
        if (count % 2 === 1) {
          return Promise.reject(new Error('Odd failure'));
        }
        return Promise.resolve(null);
      });

      const result = await getUserRanks(TEST_USER_ID, 'monthly');

      // All even calls return null, so no ranks
      expect(result).toEqual([]);
    });

    it('preserves results when only the last query fails', async () => {
      let callNum = 0;
      mockGetUserAllTimeRank.mockImplementation(() => {
        callNum++;
        if (callNum === 10) {
          return Promise.reject(new Error('Last query failed'));
        }
        return Promise.resolve({ rank: callNum });
      });

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      expect(result).toHaveLength(9);
    });

    it('preserves results when only the first query fails', async () => {
      let callNo = 0;
      mockGetUserAllTimeRank.mockImplementation(() => {
        callNo++;
        if (callNo === 1) {
          return Promise.reject(new Error('First query failed'));
        }
        return Promise.resolve({ rank: callNo });
      });

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      expect(result).toHaveLength(9);
    });
  });

  // -----------------------------------------------------------------------
  // Result content integrity
  // -----------------------------------------------------------------------

  describe('result content integrity', () => {
    it('each result contains correct module and key from ALL_LEADERBOARD_ENTRIES', async () => {
      const allResults: Record<string, { rank: number }> = {};
      let r = 1;
      for (const entry of ALL_LEADERBOARD_ENTRIES) {
        allResults[`${entry.module}:${entry.key}`] = { rank: r++ };
      }
      setAllRankResults(mockGetUserAllTimeRank, allResults);

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      for (const entry of ALL_LEADERBOARD_ENTRIES) {
        const found = result.find((r) => r.module === entry.module && r.key === entry.key);
        expect(found).toBeDefined();
      }
    });

    it('does not include duplicate entries', async () => {
      setAllRankResults(mockGetUserAllTimeRank, {
        'coordinate_quiz:white': { rank: 1 },
        'coordinate_quiz:black': { rank: 2 },
      });

      const result = await getUserRanks(TEST_USER_ID, 'all-time');

      // Verify uniqueness of module+key pairs
      const keys = result.map((r) => `${r.module}:${r.key}`);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });
});
