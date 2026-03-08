import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelectFromWhere = vi.fn();
const mockInsertValues = vi.fn().mockResolvedValue(undefined);

vi.mock('./db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => mockSelectFromWhere(),
      }),
    }),
    insert: () => ({
      values: mockInsertValues,
    }),
  },
  rateLimitEvents: {
    userId: 'user_id',
    action: 'action',
    createdAt: 'created_at',
  },
}));

vi.mock('server-only', () => ({}));

const { checkRateLimit, RATE_LIMITS } = await import('./rate-limit');

const testUserId = 'user-00000000-0000-0000-0000-000000000001';

const testConfig = {
  action: 'test_action',
  maxAttempts: 3,
  windowMs: 3_600_000,
};

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertValues.mockResolvedValue(undefined);
  });

  it('should return success when count is under the limit', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 0 }]);

    const result = await checkRateLimit(testUserId, testConfig);
    expect(result).toEqual({ success: true });
  });

  it('should return error when count is at the limit', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 3 }]);

    const result = await checkRateLimit(testUserId, testConfig);
    expect(result).toEqual({ error: 'rateLimited' });
  });

  it('should return error when count exceeds the limit', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 5 }]);

    const result = await checkRateLimit(testUserId, testConfig);
    expect(result).toEqual({ error: 'rateLimited' });
  });

  it('should insert an event when under the limit', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 1 }]);

    await checkRateLimit(testUserId, testConfig);

    expect(mockInsertValues).toHaveBeenCalledWith({
      userId: testUserId,
      action: 'test_action',
    });
  });

  it('should NOT insert an event when at the limit', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 3 }]);

    await checkRateLimit(testUserId, testConfig);

    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should NOT insert an event when over the limit', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 10 }]);

    await checkRateLimit(testUserId, testConfig);

    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should return success at maxAttempts - 1 (boundary: just under)', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 2 }]);

    const result = await checkRateLimit(testUserId, testConfig);
    expect(result).toEqual({ success: true });
    expect(mockInsertValues).toHaveBeenCalled();
  });

  it('should return error at exactly maxAttempts (boundary)', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: testConfig.maxAttempts }]);

    const result = await checkRateLimit(testUserId, testConfig);
    expect(result).toEqual({ error: 'rateLimited' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should work with different config values', async () => {
    const customConfig = { action: 'custom', maxAttempts: 1, windowMs: 60_000 };
    mockSelectFromWhere.mockResolvedValue([{ count: 0 }]);

    const result = await checkRateLimit(testUserId, customConfig);
    expect(result).toEqual({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      userId: testUserId,
      action: 'custom',
    });
  });

  it('should return error when maxAttempts is 1 and count is 1', async () => {
    const singleAttemptConfig = { action: 'single', maxAttempts: 1, windowMs: 60_000 };
    mockSelectFromWhere.mockResolvedValue([{ count: 1 }]);

    const result = await checkRateLimit(testUserId, singleAttemptConfig);
    expect(result).toEqual({ error: 'rateLimited' });
  });

  it('should return success when count is 0 (no previous events in window)', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 0 }]);

    const result = await checkRateLimit(testUserId, testConfig);
    expect(result).toEqual({ success: true });
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
  });
});

describe('RATE_LIMITS', () => {
  it('should define createPost with expected values', () => {
    expect(RATE_LIMITS.createPost).toEqual({
      action: 'create_post',
      maxAttempts: 10,
      windowMs: 3_600_000,
    });
  });

  it('should define createReply with expected values', () => {
    expect(RATE_LIMITS.createReply).toEqual({
      action: 'create_reply',
      maxAttempts: 20,
      windowMs: 3_600_000,
    });
  });

  it('should define toggleLike with expected values', () => {
    expect(RATE_LIMITS.toggleLike).toEqual({
      action: 'toggle_like',
      maxAttempts: 50,
      windowMs: 86_400_000,
    });
  });

  it('should define toggleFollow with expected values', () => {
    expect(RATE_LIMITS.toggleFollow).toEqual({
      action: 'toggle_follow',
      maxAttempts: 100,
      windowMs: 86_400_000,
    });
  });

  it('should define deletePost with expected values', () => {
    expect(RATE_LIMITS.deletePost).toEqual({
      action: 'delete_post',
      maxAttempts: 10,
      windowMs: 3_600_000,
    });
  });

  it('should define updateProfile with expected values', () => {
    expect(RATE_LIMITS.updateProfile).toEqual({
      action: 'update_profile',
      maxAttempts: 5,
      windowMs: 600_000,
    });
  });

  it('should define uploadAvatar with expected values', () => {
    expect(RATE_LIMITS.uploadAvatar).toEqual({
      action: 'upload_avatar',
      maxAttempts: 5,
      windowMs: 600_000,
    });
  });

  it('should define deleteAccount with expected values', () => {
    expect(RATE_LIMITS.deleteAccount).toEqual({
      action: 'delete_account',
      maxAttempts: 3,
      windowMs: 3_600_000,
    });
  });
});
