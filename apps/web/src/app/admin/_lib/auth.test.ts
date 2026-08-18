import { describe, expect, it, vi } from 'vitest';

import { requireAdmin } from './auth';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          mockSelectFromWhere(...args);
          return {
            limit: () =>
              mockSelectFromWhere.mock.results[mockSelectFromWhere.mock.calls.length - 1]?.value ??
              [],
          };
        },
      }),
    }),
  },
  userRoles: { userId: 'user_id' },
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';

describe('requireAdmin', () => {
  it('should return error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await requireAdmin();
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return error when no userRole record exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([]);

    const result = await requireAdmin();
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return error when user role is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await requireAdmin();
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return userId when user is admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await requireAdmin();
    expect(result).toEqual({ userId: adminUserId });
  });

  it('should return error when role is "editor" (non-admin role)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'editor' }]);

    const result = await requireAdmin();
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return error when role is empty string', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: '' }]);

    const result = await requireAdmin();
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should propagate error when db query throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    await expect(requireAdmin()).rejects.toThrow('DB connection failed');
  });

  it('should propagate error when auth getUser throws', async () => {
    mockGetUser.mockRejectedValue(new Error('Auth service unavailable'));

    await expect(requireAdmin()).rejects.toThrow('Auth service unavailable');
  });
});
