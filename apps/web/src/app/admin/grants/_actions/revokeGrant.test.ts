import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireAdmin = vi.fn();
const mockSelectFor = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockModerationInsert = vi.fn();
const mockRevalidateTag = vi.fn();
const mockGetClientIp = vi.fn();

vi.mock('@/app/admin/_lib/auth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const userGrantsTable = { __table: 'user_grants', id: 'id', revokedAt: 'revoked_at' };
const moderationActionsTable = { __table: 'moderation_actions' };

vi.mock('@/lib/db', () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: () => ({
              for: () => mockSelectFor(),
            }),
          }),
        }),
        update: () => ({
          set: (data: unknown) => {
            mockUpdateSet(data);
            return {
              where: (...args: unknown[]) => mockUpdateSetWhere(...args),
            };
          },
        }),
        insert: (table: unknown) => ({
          values: (data: unknown) => {
            if (table === moderationActionsTable) {
              mockModerationInsert(data);
              return Promise.resolve(undefined);
            }
            throw new Error('Unexpected insert target in revokeGrant test mock');
          },
        }),
      };
      return fn(tx);
    },
  },
  userGrants: userGrantsTable,
  moderationActions: moderationActionsTable,
}));

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

vi.mock('@/lib/security/client-ip', () => ({
  getClientIp: () => mockGetClientIp(),
}));

const { revokeGrant } = await import('./revokeGrant');

const targetUserId = '00000000-0000-0000-0000-000000000abc';

describe('revokeGrant', () => {
  beforeEach(() => {
    mockGetClientIp.mockResolvedValue('203.0.113.5');
    mockSelectFor.mockResolvedValue([
      {
        userId: targetUserId,
        benefitType: 'ad_free',
        grantType: 'admin_manual',
        revokedAt: null,
      },
    ]);
    mockUpdateSetWhere.mockResolvedValue(undefined);
  });

  it('should return unauthorized when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ error: 'unauthorized' });

    const result = await revokeGrant('grant-123');
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return error when grantId is empty', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await revokeGrant('');
    expect(result).toEqual({ error: 'Grant ID is required' });
  });

  it('should return error when grant does not exist', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockSelectFor.mockResolvedValue([]);

    const result = await revokeGrant('grant-123');
    expect(result).toEqual({ error: 'notFound' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
    expect(mockModerationInsert).not.toHaveBeenCalled();
  });

  it('should return error when grant is already revoked', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockSelectFor.mockResolvedValue([
      {
        userId: targetUserId,
        benefitType: 'ad_free',
        grantType: 'admin_manual',
        revokedAt: new Date('2026-04-01T00:00:00Z'),
      },
    ]);

    const result = await revokeGrant('grant-123');
    expect(result).toEqual({ error: 'alreadyRevoked' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
    expect(mockModerationInsert).not.toHaveBeenCalled();
  });

  it('should return success and update revokedAt when valid', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await revokeGrant('grant-123');
    expect(result).toEqual({ success: true });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        revokedAt: expect.any(Date),
      })
    );
  });

  it('should write a moderation_actions audit row alongside the revoke', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    await revokeGrant('grant-123');

    expect(mockModerationInsert).toHaveBeenCalledTimes(1);
    expect(mockModerationInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-id',
        action: 'revoke_grant',
        targetType: 'user',
        targetId: targetUserId,
        ipAddress: '203.0.113.5',
        metadata: expect.objectContaining({
          grantId: 'grant-123',
          grantType: 'admin_manual',
          benefitType: 'ad_free',
        }),
      })
    );
  });

  it('should call revalidateTag on success', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    await revokeGrant('grant-123');
    expect(mockRevalidateTag).toHaveBeenCalledWith('grant-status', { expire: 60 });
  });

  it('should NOT call revalidateTag when grant is not found', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockSelectFor.mockResolvedValue([]);

    await revokeGrant('grant-123');
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
