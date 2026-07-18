import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireAdmin = vi.fn();
const mockSelectFromWhereLimit = vi.fn();
const mockUserRanksInsert = vi.fn();
const mockUserRanksReturning = vi.fn();
const mockModerationInsert = vi.fn();
const mockRevalidatePath = vi.fn();
const mockGetClientIp = vi.fn();
const mockCreateNotification = vi.fn();

vi.mock('../../_lib/auth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

// Distinguish inserts by mocked table identity, following the pattern in
// admin/grants/_actions/createGrant.test.ts.
const ranksTable = { __table: 'ranks' };
const userRanksTable = { __table: 'user_ranks' };
const moderationActionsTable = { __table: 'moderation_actions' };

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        if (table !== ranksTable) {
          throw new Error('Unexpected select target in grantRank test mock');
        }
        return {
          where: () => ({
            limit: () => mockSelectFromWhereLimit(),
          }),
        };
      },
    }),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: (table: unknown) => ({
          values: (data: unknown) => {
            if (table === userRanksTable) {
              mockUserRanksInsert(data);
              return { onConflictDoNothing: () => ({ returning: () => mockUserRanksReturning() }) };
            }
            if (table === moderationActionsTable) {
              mockModerationInsert(data);
              return Promise.resolve(undefined);
            }
            throw new Error('Unexpected insert target in grantRank test mock');
          },
        }),
      };
      return fn(tx);
    },
  },
  ranks: ranksTable,
  userRanks: userRanksTable,
  moderationActions: moderationActionsTable,
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('./getClientIp', () => ({
  getClientIp: () => mockGetClientIp(),
}));

vi.mock('@/lib/notifications/notification', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

const { grantRank } = await import('./grantRank');

const targetUserId = '00000000-0000-0000-0000-000000000002';
const rankRow = { id: 'rank-id-1dan', slug: '1dan', level: 110, color: 'black' };

describe('grantRank', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockResolvedValue('203.0.113.5');
    mockSelectFromWhereLimit.mockResolvedValue([rankRow]);
    mockUserRanksReturning.mockResolvedValue([{ id: 'user-rank-row-1' }]);
  });

  it('should return unauthorized when the caller is not an admin', async () => {
    mockRequireAdmin.mockResolvedValue({ error: 'unauthorized' });

    const result = await grantRank(targetUserId, '1dan', 'Met the requirement pre-launch');
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should reject an unknown rank slug', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await grantRank(targetUserId, 'not-a-real-rank', 'reason');
    expect(result).toEqual({ error: 'invalidRank' });
    expect(mockUserRanksInsert).not.toHaveBeenCalled();
  });

  it('should reject mukyu — it has no row in the ranks table and cannot be manually granted', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await grantRank(targetUserId, 'mukyu', 'reason');
    expect(result).toEqual({ error: 'invalidRank' });
    expect(mockUserRanksInsert).not.toHaveBeenCalled();
  });

  it('should return reasonRequired when the reason is empty', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await grantRank(targetUserId, '1dan', '   ');
    expect(result).toEqual({ error: 'reasonRequired' });
    expect(mockUserRanksInsert).not.toHaveBeenCalled();
  });

  it('should return reasonTooLong when the reason exceeds 1000 characters', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await grantRank(targetUserId, '1dan', 'a'.repeat(1001));
    expect(result).toEqual({ error: 'reasonTooLong' });
  });

  it('should return rankNotFound when the slug has no matching ranks row', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockSelectFromWhereLimit.mockResolvedValue([]);

    const result = await grantRank(targetUserId, '1dan', 'reason');
    expect(result).toEqual({ error: 'rankNotFound' });
    expect(mockUserRanksInsert).not.toHaveBeenCalled();
  });

  it('should return alreadyGranted without writing an audit row when the user already holds the rank', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    // onConflictDoNothing means the insert is a no-op — .returning() comes back empty.
    mockUserRanksReturning.mockResolvedValue([]);

    const result = await grantRank(targetUserId, '1dan', 'reason');
    expect(result).toEqual({ error: 'alreadyGranted' });
    expect(mockModerationInsert).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('should insert into user_ranks and succeed on a valid grant', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await grantRank(targetUserId, '1dan', 'Met the requirement pre-launch');
    expect(result).toEqual({ success: true });
    expect(mockUserRanksInsert).toHaveBeenCalledWith({
      userId: targetUserId,
      rankId: rankRow.id,
    });
  });

  it('should write a moderation_actions audit row with the rank metadata', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    await grantRank(targetUserId, '1dan', 'Met the requirement pre-launch');
    expect(mockModerationInsert).toHaveBeenCalledWith({
      actorId: 'admin-id',
      action: 'grant_rank',
      targetType: 'user',
      targetId: targetUserId,
      reason: 'Met the requirement pre-launch',
      metadata: { rankSlug: '1dan', rankLevel: 110 },
      ipAddress: '203.0.113.5',
    });
  });

  it('should trim the reason before storing it', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    await grantRank(targetUserId, '1dan', '  Met the requirement pre-launch  ');
    expect(mockModerationInsert).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Met the requirement pre-launch' })
    );
  });

  it('should call revalidatePath with the user detail path on success', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    await grantRank(targetUserId, '1dan', 'reason');
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/users/${targetUserId}`);
  });

  it('should notify the recipient so they have a way to notice the manual grant', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    await grantRank(targetUserId, '1dan', 'Met the requirement pre-launch');
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: targetUserId,
      actorId: 'admin-id',
      type: 'rank_grant',
      targetType: 'user_rank',
      targetId: 'user-rank-row-1',
      metadata: {
        rankSlug: '1dan',
        rankLevel: 110,
        reason: 'Met the requirement pre-launch',
      },
    });
  });

  it('should return failedToGrantRank when the transaction throws unexpectedly', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockUserRanksReturning.mockRejectedValue(new Error('db is down'));

    const result = await grantRank(targetUserId, '1dan', 'reason');
    expect(result).toEqual({ error: 'failedToGrantRank' });
  });
});
