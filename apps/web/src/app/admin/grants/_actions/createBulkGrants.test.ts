import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireAdmin = vi.fn();
const mockInsertValues = vi.fn();
const mockRevalidateTag = vi.fn();
const mockSelectWhere = vi.fn();

vi.mock('@/app/admin/_lib/auth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: () => ({
          values: (data: unknown) => mockInsertValues(data),
        }),
        select: () => ({
          from: () => ({
            where: (...args: unknown[]) => mockSelectWhere(...args),
          }),
        }),
      };
      return fn(tx);
    },
  },
  userGrants: {},
}));

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => ({ op: 'eq', args }),
  isNull: (...args: unknown[]) => ({ op: 'isNull', args }),
  max: (...args: unknown[]) => ({ op: 'max', args }),
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
    mockSelectWhere.mockResolvedValue([{ maxExpires: existingExpires }]);
    mockInsertValues.mockResolvedValue(undefined);

    const result = await createBulkGrants({
      userIds: [validUserId1, validUserId2],
      durationDays: 30,
      reason: 'Campaign grant',
    });

    expect(result).toEqual({ success: true, grantedCount: 2 });
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
    expect(mockSelectWhere).toHaveBeenCalledTimes(2);

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
    mockSelectWhere.mockResolvedValue([{ maxExpires: null }]);
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
    mockSelectWhere.mockResolvedValue([{ maxExpires: null }]);
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
    mockSelectWhere.mockResolvedValue([{ maxExpires: null }]);
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
    mockSelectWhere.mockResolvedValue([{ maxExpires: null }]);
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

  it('should use current time as startsAt when no existing grant (maxExpires is null)', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockSelectWhere.mockResolvedValue([{ maxExpires: null }]);
    mockInsertValues.mockResolvedValue(undefined);

    const before = new Date();
    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: 'no existing grant',
    });
    const after = new Date();

    expect(result).toEqual({ success: true, grantedCount: 1 });
    const insertedData = mockInsertValues.mock.calls[0]?.[0] as {
      startsAt: Date;
    };
    // startsAt should be approximately now (between before and after)
    expect(insertedData.startsAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(insertedData.startsAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should use current time as startsAt when existing grant has already expired', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    const pastDate = new Date('2020-01-01T00:00:00Z');
    mockSelectWhere.mockResolvedValue([{ maxExpires: pastDate }]);
    mockInsertValues.mockResolvedValue(undefined);

    const before = new Date();
    const result = await createBulkGrants({
      userIds: [validUserId1],
      durationDays: 30,
      reason: 'expired grant',
    });
    const after = new Date();

    expect(result).toEqual({ success: true, grantedCount: 1 });
    const insertedData = mockInsertValues.mock.calls[0]?.[0] as {
      startsAt: Date;
    };
    // startsAt should be now (not the past expiry date)
    expect(insertedData.startsAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(insertedData.startsAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should trim reason whitespace in inserted grant', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockSelectWhere.mockResolvedValue([{ maxExpires: null }]);
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
    expect(mockSelectWhere).not.toHaveBeenCalled();
  });

  it('should not call revalidateTag when transaction fails', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockSelectWhere.mockResolvedValue([{ maxExpires: null }]);
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
    mockSelectWhere.mockResolvedValue([{ maxExpires: null }]);
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
