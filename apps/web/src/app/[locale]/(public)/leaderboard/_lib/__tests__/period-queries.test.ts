import { describe, expect, it, vi } from 'vitest';

import type { LeaderboardPeriod } from '../types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetAllTimeRanking = vi.fn();
const mockGetWeeklyRanking = vi.fn();
const mockGetMonthlyRanking = vi.fn();
const mockGetUserAllTimeRankedRow = vi.fn();
const mockGetUserWeeklyRankedRow = vi.fn();
const mockGetUserMonthlyRankedRow = vi.fn();
const mockGetUserAllTimeRank = vi.fn();
const mockGetUserWeeklyRank = vi.fn();
const mockGetUserMonthlyRank = vi.fn();

vi.mock('@/lib/db/challenge-queries', () => ({
  getAllTimeRanking: (...args: unknown[]) => mockGetAllTimeRanking(...args),
  getWeeklyRanking: (...args: unknown[]) => mockGetWeeklyRanking(...args),
  getMonthlyRanking: (...args: unknown[]) => mockGetMonthlyRanking(...args),
  getUserAllTimeRankedRow: (...args: unknown[]) => mockGetUserAllTimeRankedRow(...args),
  getUserWeeklyRankedRow: (...args: unknown[]) => mockGetUserWeeklyRankedRow(...args),
  getUserMonthlyRankedRow: (...args: unknown[]) => mockGetUserMonthlyRankedRow(...args),
  getUserAllTimeRank: (...args: unknown[]) => mockGetUserAllTimeRank(...args),
  getUserWeeklyRank: (...args: unknown[]) => mockGetUserWeeklyRank(...args),
  getUserMonthlyRank: (...args: unknown[]) => mockGetUserMonthlyRank(...args),
}));

const { getQueriesForPeriod } = await import('../period-queries');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getQueriesForPeriod', () => {
  // -----------------------------------------------------------------------
  // Return structure
  // -----------------------------------------------------------------------

  describe('return structure', () => {
    it('returns an object with getRanking, getUserRankedRow, and getUserRank', () => {
      const queries = getQueriesForPeriod('all-time');

      expect(queries).toHaveProperty('getRanking');
      expect(queries).toHaveProperty('getUserRankedRow');
      expect(queries).toHaveProperty('getUserRank');
      expect(typeof queries.getRanking).toBe('function');
      expect(typeof queries.getUserRankedRow).toBe('function');
      expect(typeof queries.getUserRank).toBe('function');
    });
  });

  // -----------------------------------------------------------------------
  // all-time period
  // -----------------------------------------------------------------------

  describe('all-time period', () => {
    it('maps getRanking to getAllTimeRanking', async () => {
      const queries = getQueriesForPeriod('all-time');
      mockGetAllTimeRanking.mockResolvedValue({ rows: [], total: 0 });

      await queries.getRanking('coordinate_quiz', 'white', 0, 20);

      expect(mockGetAllTimeRanking).toHaveBeenCalledWith('coordinate_quiz', 'white', 0, 20);
      expect(mockGetWeeklyRanking).not.toHaveBeenCalled();
      expect(mockGetMonthlyRanking).not.toHaveBeenCalled();
    });

    it('maps getUserRankedRow to getUserAllTimeRankedRow', async () => {
      const queries = getQueriesForPeriod('all-time');
      mockGetUserAllTimeRankedRow.mockResolvedValue(null);

      await queries.getUserRankedRow('user-1', 'legal_moves', 'king');

      expect(mockGetUserAllTimeRankedRow).toHaveBeenCalledWith('user-1', 'legal_moves', 'king');
      expect(mockGetUserWeeklyRankedRow).not.toHaveBeenCalled();
      expect(mockGetUserMonthlyRankedRow).not.toHaveBeenCalled();
    });

    it('maps getUserRank to getUserAllTimeRank', async () => {
      const queries = getQueriesForPeriod('all-time');
      mockGetUserAllTimeRank.mockResolvedValue({ rank: 5 });

      await queries.getUserRank('user-1', 'square_colors', 'default');

      expect(mockGetUserAllTimeRank).toHaveBeenCalledWith('user-1', 'square_colors', 'default');
      expect(mockGetUserWeeklyRank).not.toHaveBeenCalled();
      expect(mockGetUserMonthlyRank).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // weekly period
  // -----------------------------------------------------------------------

  describe('weekly period', () => {
    it('maps getRanking to getWeeklyRanking', async () => {
      const queries = getQueriesForPeriod('weekly');
      mockGetWeeklyRanking.mockResolvedValue({ rows: [], total: 0 });

      await queries.getRanking('coordinate_quiz', 'black', 20, 20);

      expect(mockGetWeeklyRanking).toHaveBeenCalledWith('coordinate_quiz', 'black', 20, 20);
      expect(mockGetAllTimeRanking).not.toHaveBeenCalled();
      expect(mockGetMonthlyRanking).not.toHaveBeenCalled();
    });

    it('maps getUserRankedRow to getUserWeeklyRankedRow', async () => {
      const queries = getQueriesForPeriod('weekly');
      mockGetUserWeeklyRankedRow.mockResolvedValue(null);

      await queries.getUserRankedRow('user-2', 'coordinate_quiz', 'random');

      expect(mockGetUserWeeklyRankedRow).toHaveBeenCalledWith(
        'user-2',
        'coordinate_quiz',
        'random'
      );
      expect(mockGetUserAllTimeRankedRow).not.toHaveBeenCalled();
      expect(mockGetUserMonthlyRankedRow).not.toHaveBeenCalled();
    });

    it('maps getUserRank to getUserWeeklyRank', async () => {
      const queries = getQueriesForPeriod('weekly');
      mockGetUserWeeklyRank.mockResolvedValue(null);

      await queries.getUserRank('user-2', 'legal_moves', 'queen');

      expect(mockGetUserWeeklyRank).toHaveBeenCalledWith('user-2', 'legal_moves', 'queen');
      expect(mockGetUserAllTimeRank).not.toHaveBeenCalled();
      expect(mockGetUserMonthlyRank).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // monthly period
  // -----------------------------------------------------------------------

  describe('monthly period', () => {
    it('maps getRanking to getMonthlyRanking', async () => {
      const queries = getQueriesForPeriod('monthly');
      mockGetMonthlyRanking.mockResolvedValue({ rows: [], total: 0 });

      await queries.getRanking('legal_moves', 'rook', 0, 10);

      expect(mockGetMonthlyRanking).toHaveBeenCalledWith('legal_moves', 'rook', 0, 10);
      expect(mockGetAllTimeRanking).not.toHaveBeenCalled();
      expect(mockGetWeeklyRanking).not.toHaveBeenCalled();
    });

    it('maps getUserRankedRow to getUserMonthlyRankedRow', async () => {
      const queries = getQueriesForPeriod('monthly');
      mockGetUserMonthlyRankedRow.mockResolvedValue(null);

      await queries.getUserRankedRow('user-3', 'legal_moves', 'bishop');

      expect(mockGetUserMonthlyRankedRow).toHaveBeenCalledWith('user-3', 'legal_moves', 'bishop');
      expect(mockGetUserAllTimeRankedRow).not.toHaveBeenCalled();
      expect(mockGetUserWeeklyRankedRow).not.toHaveBeenCalled();
    });

    it('maps getUserRank to getUserMonthlyRank', async () => {
      const queries = getQueriesForPeriod('monthly');
      mockGetUserMonthlyRank.mockResolvedValue({ rank: 100 });

      await queries.getUserRank('user-3', 'legal_moves', 'knight');

      expect(mockGetUserMonthlyRank).toHaveBeenCalledWith('user-3', 'legal_moves', 'knight');
      expect(mockGetUserAllTimeRank).not.toHaveBeenCalled();
      expect(mockGetUserWeeklyRank).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Consistency across periods
  // -----------------------------------------------------------------------

  describe('consistency', () => {
    it('returns the same object reference for the same period across calls', () => {
      const q1 = getQueriesForPeriod('all-time');
      const q2 = getQueriesForPeriod('all-time');

      // Since the map is a module-level constant, the same object is returned
      expect(q1).toBe(q2);
    });

    it('returns different objects for different periods', () => {
      const allTime = getQueriesForPeriod('all-time');
      const weekly = getQueriesForPeriod('weekly');
      const monthly = getQueriesForPeriod('monthly');

      expect(allTime).not.toBe(weekly);
      expect(weekly).not.toBe(monthly);
      expect(allTime).not.toBe(monthly);
    });

    it('all three periods produce objects with the same keys', () => {
      const periods: LeaderboardPeriod[] = ['all-time', 'weekly', 'monthly'];

      for (const period of periods) {
        const queries = getQueriesForPeriod(period);
        const keys = Object.keys(queries).sort();
        expect(keys).toEqual(['getRanking', 'getUserRank', 'getUserRankedRow']);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Argument forwarding
  // -----------------------------------------------------------------------

  describe('argument forwarding', () => {
    it('forwards all arguments to underlying getRanking function', async () => {
      const queries = getQueriesForPeriod('all-time');
      mockGetAllTimeRanking.mockResolvedValue({ rows: [], total: 0 });

      await queries.getRanking('square_colors', 'default', 100, 50);

      expect(mockGetAllTimeRanking).toHaveBeenCalledWith('square_colors', 'default', 100, 50);
    });

    it('forwards all arguments to underlying getUserRankedRow function', async () => {
      const queries = getQueriesForPeriod('weekly');
      mockGetUserWeeklyRankedRow.mockResolvedValue(null);

      await queries.getUserRankedRow('uuid-abc-123', 'legal_moves', 'random');

      expect(mockGetUserWeeklyRankedRow).toHaveBeenCalledWith(
        'uuid-abc-123',
        'legal_moves',
        'random'
      );
    });

    it('forwards all arguments to underlying getUserRank function', async () => {
      const queries = getQueriesForPeriod('monthly');
      mockGetUserMonthlyRank.mockResolvedValue(null);

      await queries.getUserRank('uuid-xyz-789', 'coordinate_quiz', 'white');

      expect(mockGetUserMonthlyRank).toHaveBeenCalledWith(
        'uuid-xyz-789',
        'coordinate_quiz',
        'white'
      );
    });
  });

  // -----------------------------------------------------------------------
  // Return value passthrough
  // -----------------------------------------------------------------------

  describe('return value passthrough', () => {
    it('getRanking passes through the resolved value from the underlying function', async () => {
      const queries = getQueriesForPeriod('all-time');
      const expectedResult = {
        rows: [{ userId: 'u1', score: 100 }],
        total: 1,
      };
      mockGetAllTimeRanking.mockResolvedValue(expectedResult);

      const result = await queries.getRanking('coordinate_quiz', 'white', 0, 20);

      expect(result).toBe(expectedResult);
    });

    it('getUserRankedRow passes through the resolved value from the underlying function', async () => {
      const queries = getQueriesForPeriod('weekly');
      const expectedRow = {
        userId: 'u1',
        username: 'player1',
        score: 50,
        incorrectAnswers: 1,
        timeTaken: 20,
        displayName: 'Player',
        avatarUrl: null,
        country: null,
        flair: null,
        rank: 10,
      };
      mockGetUserWeeklyRankedRow.mockResolvedValue(expectedRow);

      const result = await queries.getUserRankedRow('u1', 'coordinate_quiz', 'white');

      expect(result).toBe(expectedRow);
    });

    it('getUserRank passes through the resolved value from the underlying function', async () => {
      const queries = getQueriesForPeriod('monthly');
      const expectedRank = { rank: 42 };
      mockGetUserMonthlyRank.mockResolvedValue(expectedRank);

      const result = await queries.getUserRank('u1', 'legal_moves', 'king');

      expect(result).toBe(expectedRank);
    });

    it('getUserRankedRow passes through null when user has no entry', async () => {
      const queries = getQueriesForPeriod('all-time');
      mockGetUserAllTimeRankedRow.mockResolvedValue(null);

      const result = await queries.getUserRankedRow('nonexistent', 'coordinate_quiz', 'white');

      expect(result).toBeNull();
    });

    it('getUserRank passes through null when user has no rank', async () => {
      const queries = getQueriesForPeriod('weekly');
      mockGetUserWeeklyRank.mockResolvedValue(null);

      const result = await queries.getUserRank('nonexistent', 'legal_moves', 'random');

      expect(result).toBeNull();
    });
  });
});
