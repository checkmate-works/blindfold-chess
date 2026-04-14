import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireAdmin = vi.fn();
const mockInsertValues = vi.fn();
const mockRevalidateTag = vi.fn();
const mockCalcGrantStartsAt = vi.fn();

vi.mock('@/app/admin/_lib/auth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({
      values: (data: unknown) => mockInsertValues(data),
    }),
  },
  userGrants: {},
}));

vi.mock('@/lib/user-grants', () => ({
  calcGrantStartsAt: (...args: unknown[]) => mockCalcGrantStartsAt(...args),
}));

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

const { createGrant } = await import('./createGrant');

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}

const validUserId = '00000000-0000-0000-0000-000000000001';

const validFormData = () =>
  makeFormData({
    userId: validUserId,
    benefitType: 'ad_free',
    durationDays: '30',
    reason: 'Test grant',
  });

describe('createGrant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ error: 'unauthorized' });

    const result = await createGrant(validFormData());
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return error when userId is empty', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const fd = makeFormData({
      userId: '',
      benefitType: 'ad_free',
      durationDays: '30',
    });
    const result = await createGrant(fd);
    expect(result).toEqual({ error: 'User ID is required' });
  });

  it('should return error when userId is not a valid UUID', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const fd = makeFormData({
      userId: 'not-a-uuid',
      benefitType: 'ad_free',
      durationDays: '30',
    });
    const result = await createGrant(fd);
    expect(result).toEqual({ error: 'Invalid User ID format (expected UUID)' });
  });

  it('should return error when benefitType is empty', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const fd = makeFormData({
      userId: validUserId,
      benefitType: '',
      durationDays: '30',
    });
    const result = await createGrant(fd);
    expect(result).toEqual({ error: 'Benefit type is required' });
  });

  it('should return error when durationDays is 0', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const fd = makeFormData({
      userId: validUserId,
      benefitType: 'ad_free',
      durationDays: '0',
    });
    const result = await createGrant(fd);
    expect(result).toEqual({ error: 'Duration must be a positive number' });
  });

  it('should return error when durationDays is negative', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const fd = makeFormData({
      userId: validUserId,
      benefitType: 'ad_free',
      durationDays: '-5',
    });
    const result = await createGrant(fd);
    expect(result).toEqual({ error: 'Duration must be a positive number' });
  });

  it('should return error when durationDays exceeds 3650', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const fd = makeFormData({
      userId: validUserId,
      benefitType: 'ad_free',
      durationDays: '3651',
    });
    const result = await createGrant(fd);
    expect(result).toEqual({ error: 'Duration must not exceed 3650 days (10 years)' });
  });

  it('should return success and insert into DB when all inputs are valid', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    const startsAt = new Date('2026-04-08T12:00:00Z');
    mockCalcGrantStartsAt.mockResolvedValue(startsAt);
    mockInsertValues.mockResolvedValue(undefined);

    const result = await createGrant(validFormData());
    expect(result).toEqual({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: validUserId,
        benefitType: 'ad_free',
        grantType: 'admin_manual',
        reason: 'Test grant',
        startsAt,
      })
    );
  });

  it('should call revalidateTag on success', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());
    mockInsertValues.mockResolvedValue(undefined);

    await createGrant(validFormData());
    expect(mockRevalidateTag).toHaveBeenCalledWith('grant-status', { expire: 60 });
  });
});
