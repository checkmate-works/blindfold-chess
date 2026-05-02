import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireAdmin = vi.fn();
const mockUserGrantsInsert = vi.fn();
const mockModerationInsert = vi.fn();
const mockRevalidateTag = vi.fn();
const mockCalcGrantStartsAt = vi.fn();
const mockCreateNotification = vi.fn();
const mockGetClientIp = vi.fn();

let insertCounter = 0;

vi.mock('@/app/admin/_lib/auth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const userGrantsTable = { __table: 'user_grants' };
const moderationActionsTable = { __table: 'moderation_actions' };

vi.mock('@/lib/db', () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: (table: unknown) => ({
          values: (data: unknown) => {
            if (table === userGrantsTable) {
              const result = mockUserGrantsInsert(data);
              return {
                returning: () => {
                  if (result && typeof (result as Promise<unknown>).then === 'function') {
                    return (result as Promise<unknown>).then(() => [
                      { id: `grant-id-${++insertCounter}` },
                    ]);
                  }
                  return Promise.resolve([{ id: `grant-id-${++insertCounter}` }]);
                },
              };
            }
            if (table === moderationActionsTable) {
              return mockModerationInsert(data) ?? Promise.resolve(undefined);
            }
            throw new Error('Unexpected insert target in createBulkGrants test mock');
          },
        }),
      };
      return fn(tx);
    },
  },
  userGrants: userGrantsTable,
  moderationActions: moderationActionsTable,
}));

vi.mock('@/lib/users/user-grants', () => ({
  calcGrantStartsAt: (...args: unknown[]) => mockCalcGrantStartsAt(...args),
}));

vi.mock('@/lib/notifications/notification', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

vi.mock('@/lib/security/client-ip', () => ({
  getClientIp: () => mockGetClientIp(),
}));

const { createBulkGrants } = await import('./createBulkGrants');

const validUserId1 = '00000000-0000-0000-0000-000000000001';
const validUserId2 = '00000000-0000-0000-0000-000000000002';

describe('createBulkGrants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCounter = 0;
    mockUserGrantsInsert.mockResolvedValue(undefined);
    mockGetClientIp.mockResolvedValue('203.0.113.5');
  });

  it('should return unauthorized when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ error: 'unauthorized' });

    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: 'test',
    });
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return error when no users selected', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await createBulkGrants({
      userIds: [],
      durationDays: 30,
      reason: 'test',
    });
    expect(result).toEqual({ error: 'No users selected' });
  });

  it('should return error when a userId is invalid', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await createBulkGrants({
      userIds: [validUserId1, 'not-a-uuid'],
      durationDays: 30,
      reason: 'test',
    });
    expect(result).toEqual({ error: 'Invalid User ID format: not-a-uuid' });
  });

  it('should return error when durationDays is 0', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 0,
      reason: 'test',
    });
    expect(result).toEqual({ error: 'Duration must be a positive number' });
  });

  it('should return error when durationDays exceeds 3650', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 3651,
      reason: 'test',
    });
    expect(result).toEqual({ error: 'Duration must not exceed 3650 days (10 years)' });
  });

  it('should return error when reason is empty', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: '',
    });
    expect(result).toEqual({ error: 'Reason is required for bulk grants' });
  });

  it('should return error when reason is whitespace only', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: '   ',
    });
    expect(result).toEqual({ error: 'Reason is required for bulk grants' });
  });

  it('should create grants for all users and return success', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    const existingExpires = new Date('2026-05-01T00:00:00Z');
    mockCalcGrantStartsAt.mockResolvedValue(existingExpires);
    mockUserGrantsInsert.mockResolvedValue(undefined);

    const result = await createBulkGrants({
      userIds: [validUserId1, validUserId2],
      durationDays: 30,
      reason: 'Campaign grant',
    });

    expect(result).toEqual({ success: true, grantedCount: 2 });
    expect(mockUserGrantsInsert).toHaveBeenCalledTimes(2);
    expect(mockCalcGrantStartsAt).toHaveBeenCalledTimes(2);

    expect(mockUserGrantsInsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: validUserId1,
        benefitType: 'ad_free',
        grantType: 'admin_manual',
        reason: 'Campaign grant',
        startsAt: existingExpires,
      })
    );

    expect(mockUserGrantsInsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: validUserId2,
        benefitType: 'ad_free',
        grantType: 'admin_manual',
        reason: 'Campaign grant',
        startsAt: existingExpires,
      })
    );
  });

  it('should write one moderation_actions audit row per granted user', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date('2026-05-01T00:00:00Z'));
    mockUserGrantsInsert.mockResolvedValue(undefined);

    await createBulkGrants({
      userIds: [validUserId1, validUserId2],
      durationDays: 30,
      reason: 'Campaign grant',
    });

    expect(mockModerationInsert).toHaveBeenCalledTimes(2);
    expect(mockModerationInsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        actorId: 'admin-id',
        action: 'create_grant',
        targetType: 'user',
        targetId: validUserId1,
        reason: 'Campaign grant',
        ipAddress: '203.0.113.5',
        metadata: expect.objectContaining({
          grantId: 'grant-id-1',
          grantType: 'admin_manual',
          benefitType: 'ad_free',
          durationDays: 30,
        }),
      })
    );
    expect(mockModerationInsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        targetId: validUserId2,
        metadata: expect.objectContaining({ grantId: 'grant-id-2' }),
      })
    );
  });

  it('should call revalidateTag on success', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockUserGrantsInsert.mockResolvedValue(undefined);

    await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: 'test',
    });

    expect(mockRevalidateTag).toHaveBeenCalledWith('grant-status', { expire: 60 });
  });

  it('should return error when db insert fails', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockUserGrantsInsert.mockRejectedValue(new Error('DB error'));

    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: 'test',
    });

    expect(result).toEqual({ error: 'Failed to create bulk grants' });
  });

  it('should process duplicate userIds (grants created for each occurrence)', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockUserGrantsInsert.mockResolvedValue(undefined);

    const result = await createBulkGrants({
      userIds: [validUserId1, validUserId1],
      durationDays: 30,
      reason: 'duplicate test',
    });

    expect(result).toEqual({ success: true, grantedCount: 2 });
    expect(mockUserGrantsInsert).toHaveBeenCalledTimes(2);
    expect(mockUserGrantsInsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ userId: validUserId1 })
    );
    expect(mockUserGrantsInsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ userId: validUserId1 })
    );
  });

  it('should accept durationDays at exact upper bound (3650)', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockUserGrantsInsert.mockResolvedValue(undefined);

    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 3650,
      reason: 'max duration test',
    });

    expect(result).toEqual({ success: true, grantedCount: 1 });
  });

  it('should return error when durationDays is negative', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: -1,
      reason: 'test',
    });

    expect(result).toEqual({ error: 'Duration must be a positive number' });
  });

  it('should pass the transaction client to calcGrantStartsAt', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    const startsAt = new Date('2026-04-08T12:00:00Z');
    mockCalcGrantStartsAt.mockResolvedValue(startsAt);
    mockUserGrantsInsert.mockResolvedValue(undefined);

    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: 'tx test',
    });

    expect(result).toEqual({ success: true, grantedCount: 1 });
    expect(mockCalcGrantStartsAt).toHaveBeenCalledWith(validUserId1, 'ad_free', expect.anything());
  });

  it('should trim reason whitespace in inserted grant', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockUserGrantsInsert.mockResolvedValue(undefined);

    await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: '  padded reason  ',
    });

    expect(mockUserGrantsInsert).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'padded reason' })
    );
  });

  it('should return error when only one userId among many is invalid', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await createBulkGrants({
      userIds: [validUserId1, 'invalid-uuid', validUserId2],
      durationDays: 30,
      reason: 'test',
    });

    expect(result).toEqual({ error: 'Invalid User ID format: invalid-uuid' });
    expect(mockUserGrantsInsert).not.toHaveBeenCalled();
    expect(mockCalcGrantStartsAt).not.toHaveBeenCalled();
  });

  it('should not call revalidateTag when transaction fails', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockUserGrantsInsert.mockRejectedValue(new Error('DB error'));

    await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: 'test',
    });

    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('should rollback all inserts when error occurs mid-transaction', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockUserGrantsInsert
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB error'));

    const result = await createBulkGrants({
      userIds: [validUserId1, validUserId2],
      durationDays: 30,
      reason: 'test',
    });

    expect(result).toEqual({ error: 'Failed to create bulk grants' });
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
