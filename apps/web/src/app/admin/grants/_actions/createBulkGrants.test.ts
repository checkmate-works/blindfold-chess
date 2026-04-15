import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireAdmin = vi.fn();
const mockInsertValues = vi.fn();
const mockRevalidateTag = vi.fn();
const mockCalcGrantStartsAt = vi.fn();
const mockCreateNotification = vi.fn();

let insertCounter = 0;

vi.mock('@/app/admin/_lib/auth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: () => ({
          values: (data: unknown) => {
            const result = mockInsertValues(data);
            // Support both sync (default) and rejected promise returns
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
          },
        }),
      };
      return fn(tx);
    },
  },
  userGrants: {},
}));

vi.mock('@/lib/user-grants', () => ({
  calcGrantStartsAt: (...args: unknown[]) => mockCalcGrantStartsAt(...args),
}));

vi.mock('@/lib/notification', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

const { createBulkGrants } = await import('./createBulkGrants');

const validUserId1 = '00000000-0000-0000-0000-000000000001';
const validUserId2 = '00000000-0000-0000-0000-000000000002';

describe('createBulkGrants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCounter = 0;
    // Default: values() resolves to undefined; returning() resolves with synthetic id
    mockInsertValues.mockResolvedValue(undefined);
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
    mockInsertValues.mockResolvedValue(undefined);

    const result = await createBulkGrants({
      userIds: [validUserId1, validUserId2],
      durationDays: 30,
      reason: 'Campaign grant',
    });

    expect(result).toEqual({ success: true, grantedCount: 2 });
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
    expect(mockCalcGrantStartsAt).toHaveBeenCalledTimes(2);

    // Verify first call — startsAt should be existingExpires (future date)
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: validUserId1,
        benefitType: 'ad_free',
        grantType: 'admin_manual',
        reason: 'Campaign grant',
        startsAt: existingExpires,
      })
    );

    // Verify second call
    expect(mockInsertValues).toHaveBeenNthCalledWith(
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

  it('should call revalidateTag on success', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockInsertValues.mockResolvedValue(undefined);

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
    mockInsertValues.mockRejectedValue(new Error('DB error'));

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
    mockInsertValues.mockResolvedValue(undefined);

    const result = await createBulkGrants({
      userIds: [validUserId1, validUserId1],
      durationDays: 30,
      reason: 'duplicate test',
    });

    expect(result).toEqual({ success: true, grantedCount: 2 });
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
    // Both calls should be for the same userId
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ userId: validUserId1 })
    );
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ userId: validUserId1 })
    );
  });

  it('should accept durationDays at exact upper bound (3650)', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockInsertValues.mockResolvedValue(undefined);

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
    mockInsertValues.mockResolvedValue(undefined);

    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: 'tx test',
    });

    expect(result).toEqual({ success: true, grantedCount: 1 });
    // calcGrantStartsAt should be called with userId, benefitType, and the tx object
    expect(mockCalcGrantStartsAt).toHaveBeenCalledWith(validUserId1, 'ad_free', expect.anything());
  });

  it('should trim reason whitespace in inserted grant', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockInsertValues.mockResolvedValue(undefined);

    await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: '  padded reason  ',
    });

    expect(mockInsertValues).toHaveBeenCalledWith(
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
    // No DB operations should have occurred
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockCalcGrantStartsAt).not.toHaveBeenCalled();
  });

  it('should not call revalidateTag when transaction fails', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockInsertValues.mockRejectedValue(new Error('DB error'));

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
    // First insert succeeds, second fails
    mockInsertValues.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('DB error'));

    const result = await createBulkGrants({
      userIds: [validUserId1, validUserId2],
      durationDays: 30,
      reason: 'test',
    });

    // Transaction should fail, returning error
    expect(result).toEqual({ error: 'Failed to create bulk grants' });
    // revalidateTag should not be called on failure
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
