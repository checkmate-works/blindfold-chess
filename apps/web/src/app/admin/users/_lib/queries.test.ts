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
