import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fillDateRange, getNewUsersPerDay, getPostsPerDay } from './queries';

// --- Mocks ---

const mockListUsers = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        listUsers: mockListUsers,
      },
    },
  }),
}));

const mockOrderBy = vi.fn().mockReturnValue([]);

vi.mock('@/lib/db', () => {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    groupBy: vi.fn(),
    get orderBy() {
      return mockOrderBy;
    },
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);

  return {
    db: {
      select: () => chain,
    },
    topicPosts: {
      createdAt: 'created_at',
    },
  };
});

// --- Tests ---

describe('fillDateRange', () => {
  it('should return a single entry for same start and end date', () => {
    const result = fillDateRange('2026-03-16', '2026-03-16', new Map());
    expect(result).toEqual([{ date: '2026-03-16', count: 0 }]);
  });

  it('should fill all dates in range with zero counts', () => {
    const result = fillDateRange('2026-03-14', '2026-03-16', new Map());
    expect(result).toEqual([
      { date: '2026-03-14', count: 0 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 0 },
    ]);
  });

  it('should use counts from the map when available', () => {
    const counts = new Map([
      ['2026-03-14', 3],
      ['2026-03-16', 5],
    ]);
    const result = fillDateRange('2026-03-14', '2026-03-16', counts);
    expect(result).toEqual([
      { date: '2026-03-14', count: 3 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 5 },
    ]);
  });

  it('should handle month boundary crossing', () => {
    const counts = new Map([['2026-03-01', 2]]);
    const result = fillDateRange('2026-02-28', '2026-03-02', counts);
    expect(result).toEqual([
      { date: '2026-02-28', count: 0 },
      { date: '2026-03-01', count: 2 },
      { date: '2026-03-02', count: 0 },
    ]);
  });

  it('should handle leap year boundary (Feb 28 to Mar 1 in 2024)', () => {
    const result = fillDateRange('2024-02-28', '2024-03-01', new Map());
    expect(result).toEqual([
      { date: '2024-02-28', count: 0 },
      { date: '2024-02-29', count: 0 },
      { date: '2024-03-01', count: 0 },
    ]);
  });

  it('should handle non-leap year boundary (Feb 28 to Mar 1 in 2025)', () => {
    const result = fillDateRange('2025-02-28', '2025-03-01', new Map());
    expect(result).toEqual([
      { date: '2025-02-28', count: 0 },
      { date: '2025-03-01', count: 0 },
    ]);
  });

  it('should return empty array when start date is after end date', () => {
    const result = fillDateRange('2026-03-16', '2026-03-14', new Map());
    expect(result).toEqual([]);
  });

  it('should handle a long range (90 days)', () => {
    const result = fillDateRange('2026-01-01', '2026-03-31', new Map());
    expect(result).toHaveLength(90);
    expect(result[0].date).toBe('2026-01-01');
    expect(result[89].date).toBe('2026-03-31');
  });

  it('should ignore extra keys in the map outside the range', () => {
    const counts = new Map([
      ['2026-03-13', 10],
      ['2026-03-14', 2],
      ['2026-03-17', 10],
    ]);
    const result = fillDateRange('2026-03-14', '2026-03-16', counts);
    expect(result).toEqual([
      { date: '2026-03-14', count: 2 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 0 },
    ]);
  });

  it('should handle year boundary crossing (Dec to Jan)', () => {
    const counts = new Map([['2026-01-01', 5]]);
    const result = fillDateRange('2025-12-30', '2026-01-02', counts);
    expect(result).toEqual([
      { date: '2025-12-30', count: 0 },
      { date: '2025-12-31', count: 0 },
      { date: '2026-01-01', count: 5 },
      { date: '2026-01-02', count: 0 },
    ]);
  });

  it('should handle a very long range (365 days)', () => {
    const result = fillDateRange('2025-01-01', '2025-12-31', new Map());
    expect(result).toHaveLength(365);
    expect(result[0].date).toBe('2025-01-01');
    expect(result[364].date).toBe('2025-12-31');
  });

  it('should handle a very long range in leap year (366 days)', () => {
    const result = fillDateRange('2024-01-01', '2024-12-31', new Map());
    expect(result).toHaveLength(366);
    expect(result[59].date).toBe('2024-02-29');
  });

  it('should handle large count values', () => {
    const counts = new Map([['2026-03-14', 999999]]);
    const result = fillDateRange('2026-03-14', '2026-03-14', counts);
    expect(result).toEqual([{ date: '2026-03-14', count: 999999 }]);
  });

  it('should return all dates with count=0 when countsByDate is empty', () => {
    const result = fillDateRange('2026-03-14', '2026-03-16', new Map());
    expect(result.every((d) => d.count === 0)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it('should produce correct consecutive date sequence without gaps', () => {
    const result = fillDateRange('2026-03-01', '2026-03-10', new Map());
    for (let i = 1; i < result.length; i++) {
      const prevDate = new Date(`${result[i - 1].date}T00:00:00Z`);
      const currDate = new Date(`${result[i].date}T00:00:00Z`);
      const diffMs = currDate.getTime() - prevDate.getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000);
    }
  });
});

describe('getNewUsersPerDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return daily counts and total for users in range', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          { created_at: '2026-03-14T10:00:00Z' },
          { created_at: '2026-03-14T15:00:00Z' },
          { created_at: '2026-03-16T08:00:00Z' },
        ],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(3);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 2 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 1 },
    ]);
  });

  it('should exclude users outside the date range', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          { created_at: '2026-03-13T23:59:59Z' },
          { created_at: '2026-03-14T00:00:00Z' },
          { created_at: '2026-03-16T23:59:59Z' },
          { created_at: '2026-03-17T00:00:00Z' },
        ],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(2);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 1 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 1 },
    ]);
  });

  it('should return all zeros when no users exist', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: { users: [] },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(0);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 0 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 0 },
    ]);
  });

  it('should return all zeros when users exist but none in range', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ created_at: '2026-01-01T00:00:00Z' }, { created_at: '2026-01-02T00:00:00Z' }],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(0);
    expect(result.daily.every((d) => d.count === 0)).toBe(true);
  });

  it('should paginate when first page returns perPage users', async () => {
    // First page returns 1000 users (full page)
    const page1Users = Array.from({ length: 1000 }, (_, i) => ({
      created_at: `2026-03-14T${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
    }));
    // Second page returns fewer users (last page)
    const page2Users = [{ created_at: '2026-03-15T10:00:00Z' }];

    mockListUsers
      .mockResolvedValueOnce({ data: { users: page1Users } })
      .mockResolvedValueOnce({ data: { users: page2Users } });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(mockListUsers).toHaveBeenCalledTimes(2);
    expect(mockListUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 1000 });
    expect(mockListUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1000 });
    expect(result.total).toBe(1001);
  });

  it('should handle single-day range', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ created_at: '2026-03-14T10:00:00Z' }, { created_at: '2026-03-14T20:00:00Z' }],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-14');

    expect(result.total).toBe(2);
    expect(result.daily).toEqual([{ date: '2026-03-14', count: 2 }]);
  });

  it('should handle null data from API gracefully', async () => {
    mockListUsers.mockResolvedValueOnce({ data: null });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(0);
    expect(result.daily.length).toBe(3);
  });

  it('should include user created at exactly start boundary (T00:00:00Z)', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ created_at: '2026-03-14T00:00:00.000Z' }],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(1);
    expect(result.daily[0]).toEqual({ date: '2026-03-14', count: 1 });
  });

  it('should include user created at exactly end boundary (T23:59:59.999Z)', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ created_at: '2026-03-16T23:59:59.999Z' }],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(1);
    expect(result.daily[2]).toEqual({ date: '2026-03-16', count: 1 });
  });

  it('should correctly aggregate multiple users with identical timestamps', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          { created_at: '2026-03-15T12:00:00Z' },
          { created_at: '2026-03-15T12:00:00Z' },
          { created_at: '2026-03-15T12:00:00Z' },
        ],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(3);
    expect(result.daily[1]).toEqual({ date: '2026-03-15', count: 3 });
  });

  it('should not paginate when first page returns fewer than perPage users', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ created_at: '2026-03-14T10:00:00Z' }],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(mockListUsers).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(1);
  });

  it('should stop paginating when a page returns empty users array', async () => {
    const page1Users = Array.from({ length: 1000 }, () => ({
      created_at: '2026-03-14T10:00:00Z',
    }));

    mockListUsers
      .mockResolvedValueOnce({ data: { users: page1Users } })
      .mockResolvedValueOnce({ data: { users: [] } });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(mockListUsers).toHaveBeenCalledTimes(2);
    expect(result.total).toBe(1000);
  });

  it('should handle data with undefined users property', async () => {
    mockListUsers.mockResolvedValueOnce({ data: { users: undefined } });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(0);
    expect(result.daily.length).toBe(3);
  });
});

describe('getPostsPerDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return daily counts and total from DB results', async () => {
    mockOrderBy.mockReturnValueOnce([
      { date: '2026-03-14', count: 5 },
      { date: '2026-03-16', count: 3 },
    ]);

    const result = await getPostsPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(8);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 5 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 3 },
    ]);
  });

  it('should return all zeros when no posts exist in range', async () => {
    mockOrderBy.mockReturnValueOnce([]);

    const result = await getPostsPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(0);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 0 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 0 },
    ]);
  });

  it('should handle single-day range', async () => {
    mockOrderBy.mockReturnValueOnce([{ date: '2026-03-14', count: 7 }]);

    const result = await getPostsPerDay('2026-03-14', '2026-03-14');

    expect(result.total).toBe(7);
    expect(result.daily).toEqual([{ date: '2026-03-14', count: 7 }]);
  });

  it('should sum total correctly across multiple days', async () => {
    mockOrderBy.mockReturnValueOnce([
      { date: '2026-03-14', count: 10 },
      { date: '2026-03-15', count: 20 },
      { date: '2026-03-16', count: 30 },
    ]);

    const result = await getPostsPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(60);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 10 },
      { date: '2026-03-15', count: 20 },
      { date: '2026-03-16', count: 30 },
    ]);
  });

  it('should fill gaps between non-consecutive DB results', async () => {
    mockOrderBy.mockReturnValueOnce([
      { date: '2026-03-10', count: 1 },
      { date: '2026-03-14', count: 2 },
    ]);

    const result = await getPostsPerDay('2026-03-10', '2026-03-14');

    expect(result.total).toBe(3);
    expect(result.daily).toHaveLength(5);
    expect(result.daily[0]).toEqual({ date: '2026-03-10', count: 1 });
    expect(result.daily[1]).toEqual({ date: '2026-03-11', count: 0 });
    expect(result.daily[2]).toEqual({ date: '2026-03-12', count: 0 });
    expect(result.daily[3]).toEqual({ date: '2026-03-13', count: 0 });
    expect(result.daily[4]).toEqual({ date: '2026-03-14', count: 2 });
  });

  it('should handle large count values in DB results', async () => {
    mockOrderBy.mockReturnValueOnce([{ date: '2026-03-14', count: 100000 }]);

    const result = await getPostsPerDay('2026-03-14', '2026-03-14');

    expect(result.total).toBe(100000);
    expect(result.daily).toEqual([{ date: '2026-03-14', count: 100000 }]);
  });

  it('should return correct daily length for long range with sparse data', async () => {
    mockOrderBy.mockReturnValueOnce([{ date: '2026-01-15', count: 3 }]);

    const result = await getPostsPerDay('2026-01-01', '2026-03-31');

    expect(result.total).toBe(3);
    expect(result.daily).toHaveLength(90);
    const jan15 = result.daily.find((d) => d.date === '2026-01-15');
    expect(jan15?.count).toBe(3);
    expect(result.daily.filter((d) => d.count === 0)).toHaveLength(89);
  });
});
