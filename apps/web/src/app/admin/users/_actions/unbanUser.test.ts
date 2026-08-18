import { describe, expect, it, vi } from 'vitest';

import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { unbanUser } from './unbanUser';

const mockSelectFromWhere = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockUpdateUserById = vi.fn();
const mockInsertValues = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/db', () => {
  const makeDbOps = () => ({
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
    update: () => ({
      set: () => ({
        where: mockUpdateSetWhere,
      }),
    }),
    insert: () => ({
      values: mockInsertValues,
    }),
  });

  return {
    db: {
      ...makeDbOps(),
      transaction: async (fn: (tx: ReturnType<typeof makeDbOps>) => Promise<void>) => {
        mockTransaction();
        return fn(makeDbOps());
      },
    },
    profiles: { id: 'id', bannedAt: 'banned_at', updatedAt: 'updated_at' },
    moderationActions: {
      actorId: 'actor_id',
      action: 'action',
      targetType: 'target_type',
      targetId: 'target_id',
      reason: 'reason',
      ipAddress: 'ip_address',
    },
    userRoles: { userId: 'user_id' },
  };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        updateUserById: mockUpdateUserById,
      },
    },
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/security/client-ip');

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const targetUserId = 'target-00000000-0000-0000-0000-000000000001';

describe('unbanUser', () => {
  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await unbanUser(targetUserId);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await unbanUser(targetUserId);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should successfully unban a user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ bannedAt: new Date('2024-01-01') }]);
    mockUpdateUserById.mockResolvedValue({ error: null });

    const result = await unbanUser(targetUserId);
    expect(result).toEqual({ success: true });
    expect(mockUpdateSetWhere).toHaveBeenCalled();
    expect(mockUpdateUserById).toHaveBeenCalledWith(targetUserId, {
      ban_duration: 'none',
    });
  });

  it('should return failedToUnban without touching DB if Supabase Auth unban fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ bannedAt: new Date('2024-01-01') }]);
    mockUpdateUserById.mockResolvedValue({ error: new Error('Auth error') });

    const result = await unbanUser(targetUserId);
    expect(result).toEqual({ error: 'failedToUnban' });
    // Auth is called first; on failure, no DB updates should happen
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should return unauthorized when no userRole record exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([]);

    const result = await unbanUser(targetUserId);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should still succeed when unbanning a user who is not currently banned', async () => {
    // The unban action does not check whether the user is currently banned,
    // it simply clears the ban fields — this is idempotent behavior.
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ bannedAt: null }]);
    mockUpdateUserById.mockResolvedValue({ error: null });

    const result = await unbanUser(targetUserId);
    expect(result).toEqual({ success: true });
    expect(mockUpdateSetWhere).toHaveBeenCalled();
  });

  it('should insert a moderation_actions record with correct fields on successful unban', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ bannedAt: new Date('2024-01-01') }]);
    mockUpdateUserById.mockResolvedValue({ error: null });

    await unbanUser(targetUserId);

    expect(mockInsertValues).toHaveBeenCalledWith({
      actorId: adminUserId,
      action: 'unban',
      targetType: 'user',
      targetId: targetUserId,
      // `logModerationAction` normalizes an absent reason to null.
      reason: null,
      ipAddress: '127.0.0.1',
    });
  });

  it('should NOT insert moderation_actions when Supabase Auth unban fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ bannedAt: new Date('2024-01-01') }]);
    mockUpdateUserById.mockResolvedValue({ error: new Error('Auth error') });

    await unbanUser(targetUserId);

    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should return failedToUnban without DB changes when Supabase Auth unban fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ bannedAt: new Date('2024-01-01') }]);
    mockUpdateUserById.mockResolvedValue({ error: new Error('Auth error') });

    const result = await unbanUser(targetUserId);

    expect(result).toEqual({ error: 'failedToUnban' });
    // Auth fails first, so no DB updates should happen at all
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
  });

  it('should use db.transaction to wrap profile update and audit log atomically', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ bannedAt: new Date('2024-01-01') }]);
    mockUpdateUserById.mockResolvedValue({ error: null });

    await unbanUser(targetUserId);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('should rollback Auth unban and restore original bannedAt when DB transaction fails', async () => {
    const originalBannedAt = new Date('2024-01-01');
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ bannedAt: originalBannedAt }]);
    // Auth unban succeeds
    mockUpdateUserById.mockResolvedValue({ error: null });

    const { db } = await import('@/lib/db');
    const originalTransaction = db.transaction;
    db.transaction = vi.fn().mockRejectedValueOnce(new Error('DB transaction failed'));

    const result = await unbanUser(targetUserId);

    expect(result).toEqual({ error: 'failedToUnban' });
    // Auth unban was called first (succeeds), then DB fails, so Auth rollback (re-ban) should be called
    expect(mockUpdateUserById).toHaveBeenCalledTimes(2);
    expect(mockUpdateUserById).toHaveBeenNthCalledWith(1, targetUserId, {
      ban_duration: 'none',
    });
    expect(mockUpdateUserById).toHaveBeenNthCalledWith(2, targetUserId, {
      ban_duration: '876000h',
    });
    // bannedAt should be restored to the original value, not a new Date()
    expect(mockUpdateSetWhere).toHaveBeenCalled();

    db.transaction = originalTransaction;
  });

  it('should restore null bannedAt in rollback when user was not previously banned', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ bannedAt: null }]);
    mockUpdateUserById.mockResolvedValue({ error: null });

    const { db } = await import('@/lib/db');
    const originalTransaction = db.transaction;
    db.transaction = vi.fn().mockRejectedValueOnce(new Error('DB transaction failed'));

    const result = await unbanUser(targetUserId);

    expect(result).toEqual({ error: 'failedToUnban' });
    // Auth rollback should still re-ban
    expect(mockUpdateUserById).toHaveBeenNthCalledWith(2, targetUserId, {
      ban_duration: '876000h',
    });

    db.transaction = originalTransaction;
  });

  it('should throw when both DB transaction and Auth rollback fail (double failure)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ bannedAt: new Date('2024-01-01') }]);
    // Auth unban succeeds first call, then rollback re-ban also fails
    mockUpdateUserById
      .mockResolvedValueOnce({ error: null })
      .mockRejectedValueOnce(new Error('Auth rollback failed'));

    const { db } = await import('@/lib/db');
    const originalTransaction = db.transaction;
    db.transaction = vi.fn().mockRejectedValueOnce(new Error('DB transaction failed'));

    await expect(unbanUser(targetUserId)).rejects.toThrow('Auth rollback failed');

    db.transaction = originalTransaction;
  });
});
