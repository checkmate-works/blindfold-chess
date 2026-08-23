import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const mockRequireAdmin = vi.fn();
const mockUserGrantsInsert = vi.fn();
const mockModerationInsert = vi.fn();
const mockGrantsReturning = vi.fn();
const mockRevalidateTag = vi.fn();
const mockCalcGrantStartsAt = vi.fn();
const mockCreateNotification = vi.fn();
const mockGetClientIp = vi.fn();

vi.mock('@/app/admin/_lib/auth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

// Distinguish inserts by the mocked table object identity. The factory below
// returns a `values` shim that records the call against the right spy and
// returns a `.returning()` only for `userGrants` (audit inserts in this
// codebase do not call `returning`).
const userGrantsTable = { __table: 'user_grants' };
const moderationActionsTable = { __table: 'moderation_actions' };

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: (table: unknown) => ({
          values: (data: unknown) => {
            if (table === userGrantsTable) {
              mockUserGrantsInsert(data);
              return { returning: () => mockGrantsReturning() };
            }
            if (table === moderationActionsTable) {
              mockModerationInsert(data);
              return Promise.resolve(undefined);
            }
            throw new Error('Unexpected insert target in createGrant test mock');
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
    mockGrantsReturning.mockResolvedValue([{ id: 'grant-id-1' }]);
    mockGetClientIp.mockResolvedValue('203.0.113.5');
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

  it('should return error when benefitType is not in the allow-list', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const fd = makeFormData({
      userId: validUserId,
      // A plausible-looking but unregistered benefit type — form tampering
      // / API-direct-call simulation.
      benefitType: 'free_unicorns',
      durationDays: '30',
    });
    const result = await createGrant(fd);
    expect(result).toEqual({ error: 'Unknown benefit type: free_unicorns' });
  });

  it('should reject the removed maia_access benefit type', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    // Maia engine access is no longer a `user_grants` benefit type — it is
    // gated by subscription / per-game point charge. The benefit-type guard
    // must reject it like any other unknown value.
    const fd = makeFormData({
      userId: validUserId,
      benefitType: 'maia_access',
      durationDays: '30',
    });
    const result = await createGrant(fd);
    expect(result).toEqual({ error: 'Unknown benefit type: maia_access' });
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

  it('should return success and insert into user_grants when all inputs are valid', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    const startsAt = new Date('2026-04-08T12:00:00Z');
    mockCalcGrantStartsAt.mockResolvedValue(startsAt);

    const result = await createGrant(validFormData());
    expect(result).toEqual({ success: true });
    expect(mockUserGrantsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: validUserId,
        benefitType: 'ad_free',
        grantType: 'admin_manual',
        reason: 'Test grant',
        startsAt,
      })
    );
  });

  it('should write a moderation_actions audit row alongside the grant', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    const startsAt = new Date('2026-04-08T12:00:00Z');
    mockCalcGrantStartsAt.mockResolvedValue(startsAt);

    await createGrant(validFormData());
    expect(mockModerationInsert).toHaveBeenCalledTimes(1);
    expect(mockModerationInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-id',
        action: 'create_grant',
        targetType: 'user',
        targetId: validUserId,
        reason: 'Test grant',
        ipAddress: '203.0.113.5',
        metadata: expect.objectContaining({
          grantId: 'grant-id-1',
          grantType: 'admin_manual',
          benefitType: 'ad_free',
          durationDays: 30,
        }),
      })
    );
  });

  it('should normalize an empty reason to null in both grant and audit rows', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());

    await createGrant(
      makeFormData({
        userId: validUserId,
        benefitType: 'ad_free',
        durationDays: '30',
        reason: '   ',
      })
    );

    expect(mockUserGrantsInsert).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
    expect(mockModerationInsert).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
  });

  it('should call revalidateTag on success', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date());

    await createGrant(validFormData());
    expect(mockRevalidateTag).toHaveBeenCalledWith('grant-status', { expire: 60 });
  });

  it('should create a benefit_grant notification on success', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockCalcGrantStartsAt.mockResolvedValue(new Date('2026-04-08T12:00:00Z'));

    await createGrant(validFormData());
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: validUserId,
        actorId: 'admin-id',
        type: 'benefit_grant',
        targetType: 'user_grant',
        targetId: 'grant-id-1',
      })
    );
  });
});
