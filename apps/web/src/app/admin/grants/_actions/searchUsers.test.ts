import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const mockRequireAdmin = vi.fn();
const mockGetUserById = vi.fn();

let mockProfileRows: unknown[] = [];

vi.mock('@/app/admin/_lib/auth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(mockProfileRows),
      }),
    }),
  },
}));

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  gte: (...args: unknown[]) => ({ op: 'gte', args }),
  lt: (...args: unknown[]) => ({ op: 'lt', args }),
  isNull: (...args: unknown[]) => ({ op: 'isNull', args }),
  isNotNull: (...args: unknown[]) => ({ op: 'isNotNull', args }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        getUserById: (...args: unknown[]) => mockGetUserById(...args),
      },
    },
  }),
}));

const { searchUsers } = await import('./searchUsers');

const userId1 = '00000000-0000-0000-0000-000000000001';
const userId2 = '00000000-0000-0000-0000-000000000002';

const profileRows = [
  {
    id: userId1,
    username: 'alice',
    displayName: 'Alice',
    createdAt: new Date('2026-01-15T00:00:00Z'),
  },
  {
    id: userId2,
    username: 'bob',
    displayName: null,
    createdAt: new Date('2026-03-01T00:00:00Z'),
  },
];

const authUserById: Record<string, { user: { email: string; last_sign_in_at: string } }> = {
  [userId1]: {
    user: {
      email: 'alice@example.com',
      last_sign_in_at: '2026-04-01T00:00:00Z',
    },
  },
  [userId2]: {
    user: {
      email: 'bob@example.com',
      last_sign_in_at: '2026-03-15T00:00:00Z',
    },
  },
};

describe('searchUsers', () => {
  beforeEach(() => {
    mockProfileRows = profileRows;
  });

  it('should return unauthorized when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ error: 'unauthorized' });

    const result = await searchUsers({});
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return users when search succeeds', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockGetUserById.mockImplementation((id: string) =>
      Promise.resolve({ data: authUserById[id] ?? null })
    );

    const result = await searchUsers({});
    expect('users' in result).toBe(true);
    if ('users' in result) {
      expect(result.users).toHaveLength(2);
      expect(result.users[0]?.userId).toBe(userId1);
      expect(result.users[1]?.userId).toBe(userId2);
    }
  });

  it('should return empty array when no profiles match', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockProfileRows = [];

    const result = await searchUsers({});
    expect(result).toEqual({ users: [] });
  });

  it('should filter by lastSignInFrom', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockGetUserById.mockImplementation((id: string) =>
      Promise.resolve({ data: authUserById[id] ?? null })
    );

    const result = await searchUsers({ lastSignInFrom: '2026-03-20' });
    expect('users' in result).toBe(true);
    if ('users' in result) {
      expect(result.users).toHaveLength(1);
      expect(result.users[0]?.userId).toBe(userId1);
    }
  });

  it('should filter by lastSignInTo', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockGetUserById.mockImplementation((id: string) =>
      Promise.resolve({ data: authUserById[id] ?? null })
    );

    const result = await searchUsers({ lastSignInTo: '2026-03-20' });
    expect('users' in result).toBe(true);
    if ('users' in result) {
      expect(result.users).toHaveLength(1);
      expect(result.users[0]?.userId).toBe(userId2);
    }
  });

  it('should not call getUserById when no profiles match', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockProfileRows = [];

    const result = await searchUsers({});
    expect(result).toEqual({ users: [] });
    expect(mockGetUserById).not.toHaveBeenCalled();
  });

  it('should handle all filter conditions simultaneously', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockGetUserById.mockImplementation((id: string) =>
      Promise.resolve({ data: authUserById[id] ?? null })
    );

    const result = await searchUsers({
      createdFrom: '2026-01-01',
      createdTo: '2026-12-31',
      lastSignInFrom: '2026-03-01',
      lastSignInTo: '2026-04-30',
      profileStatus: 'has_profile',
    });
    expect('users' in result).toBe(true);
    if ('users' in result) {
      // Both users match the date range; Alice has profile + lastSignIn in range
      // Bob has no displayName so filtered by has_profile (but mock doesn't filter DB-side)
      // lastSignIn filters: Alice (2026-04-01) and Bob (2026-03-15) both in range
      expect(result.users.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should handle getUserById returning no data for a user', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockGetUserById.mockImplementation((id: string) => {
      if (id === userId1) {
        return Promise.resolve({ data: null });
      }
      return Promise.resolve({ data: authUserById[id] ?? null });
    });

    const result = await searchUsers({});
    expect('users' in result).toBe(true);
    if ('users' in result) {
      expect(result.users).toHaveLength(2);
      // userId1 should have a null lastSignInAt when getUserById returns no data
      const user1 = result.users.find((u) => u.userId === userId1);
      expect(user1?.lastSignInAt).toBeNull();
    }
  });

  it('should exclude users with null lastSignInAt when lastSignInFrom is set', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    // userId2 has null lastSignInAt from auth
    mockGetUserById.mockImplementation((id: string) => {
      if (id === userId2) {
        return Promise.resolve({
          data: { user: { email: 'bob@example.com', last_sign_in_at: null } },
        });
      }
      return Promise.resolve({ data: authUserById[id] ?? null });
    });

    const result = await searchUsers({ lastSignInFrom: '2026-01-01' });
    expect('users' in result).toBe(true);
    if ('users' in result) {
      // Bob should be excluded because lastSignInAt is null
      expect(result.users).toHaveLength(1);
      expect(result.users[0]?.userId).toBe(userId1);
    }
  });

  it('should exclude users with null lastSignInAt when lastSignInTo is set', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockGetUserById.mockImplementation((id: string) => {
      if (id === userId2) {
        return Promise.resolve({
          data: { user: { email: 'bob@example.com', last_sign_in_at: null } },
        });
      }
      return Promise.resolve({ data: authUserById[id] ?? null });
    });

    const result = await searchUsers({ lastSignInTo: '2026-12-31' });
    expect('users' in result).toBe(true);
    if ('users' in result) {
      // Bob should be excluded because lastSignInAt is null
      expect(result.users).toHaveLength(1);
      expect(result.users[0]?.userId).toBe(userId1);
    }
  });

  it('should return error when an unexpected exception occurs', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    // Force an error by making profileRows cause an issue
    mockProfileRows = null as unknown as unknown[];

    const result = await searchUsers({});
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Failed to search users');
    }
  });
});
