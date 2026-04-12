import { describe, expect, it, vi } from 'vitest';

/**
 * Tests for fetchUsersPageData totalCount integration.
 *
 * Since fetchUsersPageData depends on Supabase admin client and Drizzle DB,
 * we mock those dependencies and verify totalCount is correctly returned.
 */

// Mock the db module with a builder pattern to support method chaining (including orderBy)
const mockResult: unknown[] = [];
const mockWhereResult = {
  orderBy: vi.fn().mockResolvedValue(mockResult),
  [Symbol.iterator]: function* () {
    yield* mockResult;
  },
  then: (resolve: (val: unknown[]) => void) => Promise.resolve(mockResult).then(resolve),
};

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(mockWhereResult),
      }),
    }),
  },
  profiles: { id: 'id', $inferSelect: {} },
  userRoles: { userId: 'userId', role: 'role' },
  subscriptions: { userId: 'userId', status: 'status' },
  moderationActions: {
    targetId: 'targetId',
    reason: 'reason',
    createdAt: 'createdAt',
    action: 'action',
    targetType: 'targetType',
  },
  ranks: { id: 'id', slug: 'slug' },
  userRanks: { userId: 'userId', rankId: 'rankId' },
}));

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
  eq: (a: unknown, b: unknown) => [a, b],
  inArray: (col: unknown, vals: unknown) => [col, vals],
}));

vi.mock('@/lib/subscription-constants', () => ({
  BENEFIT_ACTIVE_STATUSES: ['active'],
}));

describe('fetchUsersPageData', () => {
  it('should return totalCount in the result when no status filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: mockUsers,
              total: 50,
            },
            error: null,
          }),
        },
      },
    };

    const { fetchUsersPageData } = await import('./queries');
    const result = await fetchUsersPageData(mockAdminClient as never, 1, '');

    expect(result).toHaveProperty('totalCount');
    expect(result.totalCount).toBe(50);
  });

  it('should return totalCount reflecting filtered count when status filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: mockUsers,
              total: 3,
            },
            error: null,
          }),
        },
      },
    };

    // All users have no profile → they are all "anonymous"
    const { fetchUsersPageData } = await import('./queries');
    const result = await fetchUsersPageData(mockAdminClient as never, 1, 'anonymous');

    expect(result).toHaveProperty('totalCount');
    expect(result.totalCount).toBe(3);
  });

  it('should return totalCount of 0 when no users match the filter', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [],
              total: 0,
            },
            error: null,
          }),
        },
      },
    };

    const { fetchUsersPageData } = await import('./queries');
    const result = await fetchUsersPageData(mockAdminClient as never, 1, 'active');

    expect(result).toHaveProperty('totalCount');
    expect(result.totalCount).toBe(0);
  });

  it('should return totalCount of 0 when no status filter and API returns total 0', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [],
              total: 0,
            },
            error: null,
          }),
        },
      },
    };

    const { fetchUsersPageData } = await import('./queries');
    const result = await fetchUsersPageData(mockAdminClient as never, 1, '');

    expect(result.totalCount).toBe(0);
    expect(result.users).toEqual([]);
  });

  it('should default totalCount to 0 when API response lacks total property', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [],
            },
            error: null,
          }),
        },
      },
    };

    const { fetchUsersPageData } = await import('./queries');
    const result = await fetchUsersPageData(mockAdminClient as never, 1, '');

    expect(result.totalCount).toBe(0);
  });

  it('should return totalCount reflecting only active users when active filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'active@example.com' },
      { id: 'user-2', email: 'banned@example.com' },
      { id: 'user-3', email: 'anon@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 3 },
            error: null,
          }),
        },
      },
    };

    // Mock profiles: user-1 is active, user-2 is banned, user-3 has no profile (anonymous)
    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', bannedAt: null, deletedAt: null },
              { id: 'user-2', bannedAt: new Date('2024-01-15'), deletedAt: null },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchUsersPageData } = await import('./queries');
    const result = await fetchUsersPageData(mockAdminClient as never, 1, 'active');

    // Only user-1 is active (has profile, not banned, not deleted)
    expect(result.totalCount).toBe(1);
  });

  it('should return totalCount reflecting only banned users when banned filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'active@example.com' },
      { id: 'user-2', email: 'banned@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 2 },
            error: null,
          }),
        },
      },
    };

    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', bannedAt: null, deletedAt: null },
              { id: 'user-2', bannedAt: new Date('2024-01-15'), deletedAt: null },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchUsersPageData } = await import('./queries');
    const result = await fetchUsersPageData(mockAdminClient as never, 1, 'banned');

    // Only user-2 is banned
    expect(result.totalCount).toBe(1);
  });

  it('should return totalCount reflecting only deleted users when deleted filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'active@example.com' },
      { id: 'user-2', email: 'deleted@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 2 },
            error: null,
          }),
        },
      },
    };

    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', bannedAt: null, deletedAt: null },
              { id: 'user-2', bannedAt: null, deletedAt: new Date('2024-06-01') },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchUsersPageData } = await import('./queries');
    const result = await fetchUsersPageData(mockAdminClient as never, 1, 'deleted');

    // Only user-2 is deleted
    expect(result.totalCount).toBe(1);
  });

  it('should return correct pagination and totalCount for last page with fewer items', async () => {
    // Simulate 25 total users, page 2 should have 5 users (DEFAULT_PAGE_SIZE = 20)
    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: Array.from({ length: 5 }, (_, i) => ({
                id: `user-${i + 21}`,
                email: `user${i + 21}@example.com`,
              })),
              total: 25,
            },
            error: null,
          }),
        },
      },
    };

    const { fetchUsersPageData } = await import('./queries');
    const result = await fetchUsersPageData(mockAdminClient as never, 2, '');

    expect(result.totalCount).toBe(25);
    expect(result.users).toHaveLength(5);
    expect(result.currentPage).toBe(2);
    expect(result.totalPages).toBe(2);
  });

  it('should include all required properties in UsersPageData', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [], total: 0 },
            error: null,
          }),
        },
      },
    };

    const { fetchUsersPageData } = await import('./queries');
    const result = await fetchUsersPageData(mockAdminClient as never, 1, '');

    expect(result).toHaveProperty('users');
    expect(result).toHaveProperty('currentPage');
    expect(result).toHaveProperty('totalPages');
    expect(result).toHaveProperty('totalCount');
    expect(result).toHaveProperty('profileMap');
    expect(result).toHaveProperty('roleMap');
    expect(result).toHaveProperty('subscriptionMap');
    expect(result).toHaveProperty('banReasonMap');
  });
});

describe('fetchCountryStats', () => {
  it('should aggregate country stats without any status filter', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 3 },
            error: null,
          }),
        },
      },
    };

    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
              { id: 'user-2', country: 'US', bannedAt: null, deletedAt: null },
              { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchCountryStats } = await import('./queries');
    const result = await fetchCountryStats(mockAdminClient as never, '');

    expect(result).toEqual([
      { country: 'JP', count: 2 },
      { country: 'US', count: 1 },
    ]);
  });

  it('should return results sorted by count in descending order', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
      { id: 'user-4', email: 'd@example.com' },
      { id: 'user-5', email: 'e@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 5 },
            error: null,
          }),
        },
      },
    };

    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', country: 'FR', bannedAt: null, deletedAt: null },
              { id: 'user-2', country: 'US', bannedAt: null, deletedAt: null },
              { id: 'user-3', country: 'US', bannedAt: null, deletedAt: null },
              { id: 'user-4', country: 'US', bannedAt: null, deletedAt: null },
              { id: 'user-5', country: 'FR', bannedAt: null, deletedAt: null },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchCountryStats } = await import('./queries');
    const result = await fetchCountryStats(mockAdminClient as never, '');

    expect(result).toEqual([
      { country: 'US', count: 3 },
      { country: 'FR', count: 2 },
    ]);
  });

  it('should group users with null country as Unknown', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 3 },
            error: null,
          }),
        },
      },
    };

    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', country: null, bannedAt: null, deletedAt: null },
              { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: null },
              { id: 'user-3', country: null, bannedAt: null, deletedAt: null },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchCountryStats } = await import('./queries');
    const result = await fetchCountryStats(mockAdminClient as never, '');

    expect(result).toEqual([
      { country: 'Unknown', count: 2 },
      { country: 'JP', count: 1 },
    ]);
  });

  it('should return empty array when there are no users', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [], total: 0 },
            error: null,
          }),
        },
      },
    };

    const { fetchCountryStats } = await import('./queries');
    const result = await fetchCountryStats(mockAdminClient as never, '');

    expect(result).toEqual([]);
  });

  it('should aggregate only active users when active filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'active@example.com' },
      { id: 'user-2', email: 'banned@example.com' },
      { id: 'user-3', email: 'active2@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 3 },
            error: null,
          }),
        },
      },
    };

    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
              { id: 'user-2', country: 'US', bannedAt: new Date('2024-01-15'), deletedAt: null },
              { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchCountryStats } = await import('./queries');
    const result = await fetchCountryStats(mockAdminClient as never, 'active');

    // Only user-1 and user-3 are active (both JP)
    expect(result).toEqual([{ country: 'JP', count: 2 }]);
  });

  it('should aggregate only banned users when banned filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'active@example.com' },
      { id: 'user-2', email: 'banned@example.com' },
      { id: 'user-3', email: 'banned2@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 3 },
            error: null,
          }),
        },
      },
    };

    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
              { id: 'user-2', country: 'US', bannedAt: new Date('2024-01-15'), deletedAt: null },
              { id: 'user-3', country: 'FR', bannedAt: new Date('2024-02-01'), deletedAt: null },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchCountryStats } = await import('./queries');
    const result = await fetchCountryStats(mockAdminClient as never, 'banned');

    expect(result).toEqual([
      { country: 'US', count: 1 },
      { country: 'FR', count: 1 },
    ]);
  });

  it('should aggregate only anonymous users when anonymous filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 3 },
            error: null,
          }),
        },
      },
    };

    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchCountryStats } = await import('./queries');
    const result = await fetchCountryStats(mockAdminClient as never, 'anonymous');

    // user-2 and user-3 have no profile → anonymous, and no profile means no country → Unknown
    expect(result).toEqual([{ country: 'Unknown', count: 2 }]);
  });

  it('should aggregate only deleted users when deleted filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 2 },
            error: null,
          }),
        },
      },
    };

    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', country: 'US', bannedAt: null, deletedAt: null },
              { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: new Date('2024-06-01') },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchCountryStats } = await import('./queries');
    const result = await fetchCountryStats(mockAdminClient as never, 'deleted');

    // Only user-2 is deleted
    expect(result).toEqual([{ country: 'JP', count: 1 }]);
  });

  it('should return single entry when all users are from the same country', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 3 },
            error: null,
          }),
        },
      },
    };

    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
              { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: null },
              { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchCountryStats } = await import('./queries');
    const result = await fetchCountryStats(mockAdminClient as never, '');

    expect(result).toEqual([{ country: 'JP', count: 3 }]);
  });

  it('should return single Unknown entry when all users have null country', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 2 },
            error: null,
          }),
        },
      },
    };

    const { db } = await import('@/lib/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (resolve: (val: unknown[]) => void) =>
            Promise.resolve([
              { id: 'user-1', country: null, bannedAt: null, deletedAt: null },
              { id: 'user-2', country: null, bannedAt: null, deletedAt: null },
            ]).then(resolve),
        }),
      }),
    });

    const { fetchCountryStats } = await import('./queries');
    const result = await fetchCountryStats(mockAdminClient as never, '');

    expect(result).toEqual([{ country: 'Unknown', count: 2 }]);
  });
});

/**
 * Helper to create a db.select mock that dispatches by table reference.
 *
 * fetchRankStats internally calls:
 *   1. db.select().from(profiles).where(...)          — via fetchFilteredUsers (skipped if 0 users)
 *   2. db.select().from(ranks)                        — all rank records (directly awaited)
 *   3. db.select().from(userRanks).where(...)         — user rank rows (skipped if 0 filtered users)
 */
async function setupRankStatsMock(options: {
  profileRows: Array<{ id: string; bannedAt: Date | null; deletedAt: Date | null }>;
  rankRows: Array<{ id: number; slug: string }>;
  userRankRows: Array<{ userId: string; rankId: number }>;
}) {
  const dbMod = await import('@/lib/db');
  const mockSelect = dbMod.db.select as ReturnType<typeof vi.fn>;
  const ranksRef = dbMod.ranks;
  const userRanksRef = dbMod.userRanks;

  mockSelect.mockImplementation(() => ({
    from: vi.fn().mockImplementation((table: unknown) => {
      if (table === ranksRef) {
        // ranks query — directly awaited, no .where()
        return {
          where: vi.fn().mockReturnValue({
            then: (resolve: (val: unknown[]) => void, reject?: (err: unknown) => void) =>
              Promise.resolve(options.rankRows).then(resolve, reject),
          }),
          then: (resolve: (val: unknown[]) => void, reject?: (err: unknown) => void) =>
            Promise.resolve(options.rankRows).then(resolve, reject),
        };
      } else if (table === userRanksRef) {
        // userRanks query
        return {
          where: vi.fn().mockReturnValue({
            then: (resolve: (val: unknown[]) => void, reject?: (err: unknown) => void) =>
              Promise.resolve(options.userRankRows).then(resolve, reject),
          }),
        };
      } else {
        // Default: profiles and other tables
        return {
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
            then: (resolve: (val: unknown[]) => void, reject?: (err: unknown) => void) =>
              Promise.resolve(options.profileRows).then(resolve, reject),
          }),
        };
      }
    }),
  }));
}

describe('fetchRankStats', () => {
  it('should count all users as mukyu when no user has a rank', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 3 },
            error: null,
          }),
        },
      },
    };

    await setupRankStatsMock({
      profileRows: [
        { id: 'user-1', bannedAt: null, deletedAt: null },
        { id: 'user-2', bannedAt: null, deletedAt: null },
        { id: 'user-3', bannedAt: null, deletedAt: null },
      ],
      rankRows: [
        { id: 1, slug: '5kyu' },
        { id: 2, slug: '4kyu' },
        { id: 3, slug: '3kyu' },
        { id: 4, slug: '2kyu' },
        { id: 5, slug: '1kyu' },
        { id: 6, slug: '1dan' },
      ],
      userRankRows: [], // no users have ranks
    });

    const { fetchRankStats } = await import('./queries');
    const result = await fetchRankStats(mockAdminClient as never, '');

    // All 3 users should be counted as mukyu
    const mukyu = result.find((r) => r.slug === 'mukyu');
    expect(mukyu).toBeDefined();
    expect(mukyu!.count).toBe(3);

    // All other ranks should have count 0
    const nonMukyu = result.filter((r) => r.slug !== 'mukyu');
    for (const rank of nonMukyu) {
      expect(rank.count).toBe(0);
    }
  });

  it('should include all ranks from ALL_RANK_SLUGS in results', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [], total: 0 },
            error: null,
          }),
        },
      },
    };

    await setupRankStatsMock({
      profileRows: [],
      rankRows: [
        { id: 1, slug: '5kyu' },
        { id: 2, slug: '4kyu' },
        { id: 3, slug: '3kyu' },
        { id: 4, slug: '2kyu' },
        { id: 5, slug: '1kyu' },
        { id: 6, slug: '1dan' },
      ],
      userRankRows: [],
    });

    const { fetchRankStats } = await import('./queries');
    const { ALL_RANK_SLUGS: allSlugs } = await import('@/lib/db/data/ranks');
    const result = await fetchRankStats(mockAdminClient as never, '');

    const resultSlugs = result.map((r) => r.slug);
    for (const slug of allSlugs) {
      expect(resultSlugs).toContain(slug);
    }
    expect(result).toHaveLength(allSlugs.length);
  });

  it('should return results sorted by level in ascending order', async () => {
    const mockUsers = [{ id: 'user-1', email: 'a@example.com' }];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 1 },
            error: null,
          }),
        },
      },
    };

    await setupRankStatsMock({
      profileRows: [{ id: 'user-1', bannedAt: null, deletedAt: null }],
      rankRows: [
        { id: 1, slug: '5kyu' },
        { id: 2, slug: '4kyu' },
        { id: 3, slug: '3kyu' },
        { id: 4, slug: '2kyu' },
        { id: 5, slug: '1kyu' },
        { id: 6, slug: '1dan' },
      ],
      userRankRows: [],
    });

    const { fetchRankStats } = await import('./queries');
    const result = await fetchRankStats(mockAdminClient as never, '');

    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.level).toBeGreaterThanOrEqual(result[i - 1]!.level);
    }

    // Verify specific order: mukyu(0) < 5kyu(10) < 4kyu(20) < 3kyu(30) < 2kyu(40) < 1kyu(50) < 1dan(110)
    expect(result[0]!.slug).toBe('mukyu');
    expect(result[result.length - 1]!.slug).toBe('1dan');
  });

  it('should include Coming Soon ranks (2kyu, 1kyu, 1dan) with count 0', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 2 },
            error: null,
          }),
        },
      },
    };

    await setupRankStatsMock({
      profileRows: [
        { id: 'user-1', bannedAt: null, deletedAt: null },
        { id: 'user-2', bannedAt: null, deletedAt: null },
      ],
      rankRows: [
        { id: 1, slug: '5kyu' },
        { id: 2, slug: '4kyu' },
        { id: 3, slug: '3kyu' },
        { id: 4, slug: '2kyu' },
        { id: 5, slug: '1kyu' },
        { id: 6, slug: '1dan' },
      ],
      userRankRows: [
        { userId: 'user-1', rankId: 1 }, // 5kyu
      ],
    });

    const { fetchRankStats } = await import('./queries');
    const result = await fetchRankStats(mockAdminClient as never, '');

    // Coming Soon ranks should exist with count 0
    const comingSoonSlugs = ['2kyu', '1kyu', '1dan'];
    for (const slug of comingSoonSlugs) {
      const rank = result.find((r) => r.slug === slug);
      expect(rank).toBeDefined();
      expect(rank!.count).toBe(0);
    }
  });

  it('should correctly count ranked and unranked users', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
      { id: 'user-4', email: 'd@example.com' },
      { id: 'user-5', email: 'e@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 5 },
            error: null,
          }),
        },
      },
    };

    await setupRankStatsMock({
      profileRows: [
        { id: 'user-1', bannedAt: null, deletedAt: null },
        { id: 'user-2', bannedAt: null, deletedAt: null },
        { id: 'user-3', bannedAt: null, deletedAt: null },
        { id: 'user-4', bannedAt: null, deletedAt: null },
        { id: 'user-5', bannedAt: null, deletedAt: null },
      ],
      rankRows: [
        { id: 1, slug: '5kyu' },
        { id: 2, slug: '4kyu' },
        { id: 3, slug: '3kyu' },
        { id: 4, slug: '2kyu' },
        { id: 5, slug: '1kyu' },
        { id: 6, slug: '1dan' },
      ],
      userRankRows: [
        { userId: 'user-1', rankId: 1 }, // 5kyu
        { userId: 'user-2', rankId: 1 }, // 5kyu
        { userId: 'user-3', rankId: 2 }, // 4kyu
      ],
    });

    const { fetchRankStats } = await import('./queries');
    const result = await fetchRankStats(mockAdminClient as never, '');

    // 2 users have 5kyu, 1 has 4kyu, 2 are unranked (mukyu)
    // Note: user-1 and user-2 have ranks so they are NOT mukyu
    // user-4 and user-5 have no ranks → mukyu
    expect(result.find((r) => r.slug === 'mukyu')!.count).toBe(2);
    expect(result.find((r) => r.slug === '5kyu')!.count).toBe(2);
    expect(result.find((r) => r.slug === '4kyu')!.count).toBe(1);
    expect(result.find((r) => r.slug === '3kyu')!.count).toBe(0);
  });

  it('should return all ranks with count 0 when there are no users', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [], total: 0 },
            error: null,
          }),
        },
      },
    };

    await setupRankStatsMock({
      profileRows: [],
      rankRows: [
        { id: 1, slug: '5kyu' },
        { id: 2, slug: '4kyu' },
        { id: 3, slug: '3kyu' },
        { id: 4, slug: '2kyu' },
        { id: 5, slug: '1kyu' },
        { id: 6, slug: '1dan' },
      ],
      userRankRows: [],
    });

    const { fetchRankStats } = await import('./queries');
    const result = await fetchRankStats(mockAdminClient as never, '');

    // All ranks should have count 0, including mukyu
    for (const rank of result) {
      expect(rank.count).toBe(0);
    }
  });

  it('should assign correct colors from BELT_COLOR_HEX for each rank', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [], total: 0 },
            error: null,
          }),
        },
      },
    };

    await setupRankStatsMock({
      profileRows: [],
      rankRows: [
        { id: 1, slug: '5kyu' },
        { id: 2, slug: '4kyu' },
        { id: 3, slug: '3kyu' },
        { id: 4, slug: '2kyu' },
        { id: 5, slug: '1kyu' },
        { id: 6, slug: '1dan' },
      ],
      userRankRows: [],
    });

    const { fetchRankStats } = await import('./queries');
    const { BELT_COLOR_HEX: beltColors, RANK_COLORS: rankColors } = await import(
      '@/lib/db/data/ranks'
    );
    const result = await fetchRankStats(mockAdminClient as never, '');

    for (const rank of result) {
      const expectedColorName = rankColors[rank.slug as keyof typeof rankColors];
      const expectedHex = beltColors[expectedColorName];
      expect(rank.color).toBe(expectedHex);
    }
  });

  it('should assign correct level values from seed data', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [], total: 0 },
            error: null,
          }),
        },
      },
    };

    await setupRankStatsMock({
      profileRows: [],
      rankRows: [
        { id: 1, slug: '5kyu' },
        { id: 2, slug: '4kyu' },
        { id: 3, slug: '3kyu' },
        { id: 4, slug: '2kyu' },
        { id: 5, slug: '1kyu' },
        { id: 6, slug: '1dan' },
      ],
      userRankRows: [],
    });

    const { fetchRankStats } = await import('./queries');
    const result = await fetchRankStats(mockAdminClient as never, '');

    expect(result.find((r) => r.slug === 'mukyu')!.level).toBe(0);
    expect(result.find((r) => r.slug === '5kyu')!.level).toBe(10);
    expect(result.find((r) => r.slug === '4kyu')!.level).toBe(20);
    expect(result.find((r) => r.slug === '3kyu')!.level).toBe(30);
    expect(result.find((r) => r.slug === '2kyu')!.level).toBe(40);
    expect(result.find((r) => r.slug === '1kyu')!.level).toBe(50);
    expect(result.find((r) => r.slug === '1dan')!.level).toBe(110);
  });

  it('should count a user with multiple ranks only once for mukyu calculation', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 2 },
            error: null,
          }),
        },
      },
    };

    await setupRankStatsMock({
      profileRows: [
        { id: 'user-1', bannedAt: null, deletedAt: null },
        { id: 'user-2', bannedAt: null, deletedAt: null },
      ],
      rankRows: [
        { id: 1, slug: '5kyu' },
        { id: 2, slug: '4kyu' },
        { id: 3, slug: '3kyu' },
        { id: 4, slug: '2kyu' },
        { id: 5, slug: '1kyu' },
        { id: 6, slug: '1dan' },
      ],
      userRankRows: [
        // user-1 has both 5kyu and 4kyu (earned both)
        { userId: 'user-1', rankId: 1 },
        { userId: 'user-1', rankId: 2 },
      ],
    });

    const { fetchRankStats } = await import('./queries');
    const result = await fetchRankStats(mockAdminClient as never, '');

    // user-1 holds ranks, user-2 does not → mukyu = 1
    expect(result.find((r) => r.slug === 'mukyu')!.count).toBe(1);
    // user-1 counted once for each rank slug
    expect(result.find((r) => r.slug === '5kyu')!.count).toBe(1);
    expect(result.find((r) => r.slug === '4kyu')!.count).toBe(1);
  });

  it('should use name equal to slug for each rank', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [], total: 0 },
            error: null,
          }),
        },
      },
    };

    await setupRankStatsMock({
      profileRows: [],
      rankRows: [
        { id: 1, slug: '5kyu' },
        { id: 2, slug: '4kyu' },
        { id: 3, slug: '3kyu' },
        { id: 4, slug: '2kyu' },
        { id: 5, slug: '1kyu' },
        { id: 6, slug: '1dan' },
      ],
      userRankRows: [],
    });

    const { fetchRankStats } = await import('./queries');
    const result = await fetchRankStats(mockAdminClient as never, '');

    for (const rank of result) {
      expect(rank.name).toBe(rank.slug);
    }
  });

  it('should only count filtered users for mukyu when status filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'active@example.com' },
      { id: 'user-2', email: 'banned@example.com' },
      { id: 'user-3', email: 'active2@example.com' },
    ];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: mockUsers, total: 3 },
            error: null,
          }),
        },
      },
    };

    await setupRankStatsMock({
      profileRows: [
        { id: 'user-1', bannedAt: null, deletedAt: null },
        { id: 'user-2', bannedAt: new Date('2024-01-15'), deletedAt: null },
        { id: 'user-3', bannedAt: null, deletedAt: null },
      ],
      rankRows: [
        { id: 1, slug: '5kyu' },
        { id: 2, slug: '4kyu' },
        { id: 3, slug: '3kyu' },
        { id: 4, slug: '2kyu' },
        { id: 5, slug: '1kyu' },
        { id: 6, slug: '1dan' },
      ],
      userRankRows: [
        { userId: 'user-1', rankId: 1 }, // 5kyu — active
      ],
    });

    const { fetchRankStats } = await import('./queries');
    const result = await fetchRankStats(mockAdminClient as never, 'active');

    // active filter: user-1 (active, ranked), user-3 (active, unranked)
    // user-2 is banned → excluded
    // mukyu = 2 active users - 1 ranked user = 1
    expect(result.find((r) => r.slug === 'mukyu')!.count).toBe(1);
    expect(result.find((r) => r.slug === '5kyu')!.count).toBe(1);
  });
});
