import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PROFILE_PII_COLUMNS, deleteAccount } from './delete-account';

const mockDeleteUser = vi.fn();
const mockList = vi.fn();
const mockRemove = vi.fn();
const mockLogActivityEvent = vi.fn();
const mockCancelAllActiveSubscriptions = vi.fn();

const mockSet = vi.fn();
const mockWhere = vi.fn().mockResolvedValue(undefined);

// `db.delete(likes).where(...)` — capture the WHERE condition so we can read
// back which target_type each received-likes deletion scoped to.
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn((..._args: unknown[]) => ({ where: mockDeleteWhere }));
// `db.select({ id }).from(table).where(...)` — the owned-content subquery fed
// to `inArray`. Records the `from` table and the owner-column predicate.
const mockSelectWhere = vi.fn(() => 'owned-content-subquery');
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn((..._args: unknown[]) => ({ from: mockSelectFrom }));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// drizzle-orm helpers are mocked as passthrough capturers: the mocked `db`
// chain ignores the conditions, but we keep their raw args so assertions can
// read the scoped target_type / owner column without a real query builder.
vi.mock('drizzle-orm', () => ({
  and: (...conds: unknown[]) => ({ __and: conds }),
  eq: (column: unknown, value: unknown) => ({ __eq: [column, value] }),
  inArray: (column: unknown, values: unknown) => ({ __inArray: [column, values] }),
  isNull: (column: unknown) => ({ __isNull: column }),
}));

vi.mock('@/lib/billing/cancel-subscriptions', () => ({
  cancelAllActiveSubscriptions: (...args: unknown[]) => mockCancelAllActiveSubscriptions(...args),
}));

vi.mock('@/lib/db', () => ({
  db: {
    update: () => ({
      set: (values: Record<string, unknown>) => {
        mockSet(values);
        return { where: mockWhere };
      },
    }),
    delete: (...args: unknown[]) => mockDelete(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
  profiles: { id: 'id' },
  likes: { targetType: 'likes.targetType', targetId: 'likes.targetId', userId: 'likes.userId' },
  topicPosts: { id: 'topicPosts.id', userId: 'topicPosts.userId' },
  positions: { id: 'positions.id', userId: 'positions.userId' },
  chunks: {
    id: 'chunks.id',
    userId: 'chunks.userId',
    status: 'chunks.status',
    deletedAt: 'chunks.deletedAt',
  },
  repertoires: { id: 'repertoires.id', userId: 'repertoires.userId' },
  games: { id: 'games.id', authorId: 'games.authorId' },
  gameComments: { id: 'gameComments.id', authorId: 'gameComments.authorId' },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        deleteUser: mockDeleteUser,
      },
    },
    storage: {
      from: () => ({
        list: mockList,
        remove: mockRemove,
      }),
    },
  }),
}));

// delete-account.ts must NOT log to the activity log; mocking lets us assert it.
vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivityEvent(...args),
}));

const testUserId = 'user-id-00000000-0000-0000-0000-000000000001';

describe('deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteUser.mockResolvedValue({ error: null });
    mockList.mockResolvedValue({ data: [{ name: 'avatar.webp' }] });
    mockRemove.mockResolvedValue({ data: [], error: null });
    mockWhere.mockResolvedValue(undefined);
    mockCancelAllActiveSubscriptions.mockResolvedValue(undefined);
  });

  it('soft-deletes the auth user first', async () => {
    const result = await deleteAccount(testUserId);

    expect(result).toEqual({ ok: true });
    expect(mockDeleteUser).toHaveBeenCalledWith(testUserId, true);
  });

  describe('Stripe subscription cancellation', () => {
    it('cancels subscriptions before soft-deleting the auth user', async () => {
      const order: string[] = [];
      mockCancelAllActiveSubscriptions.mockImplementation(async () => {
        order.push('cancel');
      });
      mockDeleteUser.mockImplementation(async () => {
        order.push('deleteUser');
        return { error: null };
      });

      await deleteAccount(testUserId);

      expect(mockCancelAllActiveSubscriptions).toHaveBeenCalledWith(testUserId);
      expect(order).toEqual(['cancel', 'deleteUser']);
    });

    it('aborts and does not soft-delete when cancellation fails', async () => {
      mockCancelAllActiveSubscriptions.mockRejectedValue(new Error('Stripe is down'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await deleteAccount(testUserId);

      expect(result).toEqual({ ok: false, error: 'failed_to_cancel_subscription' });
      expect(mockDeleteUser).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
      expect(mockRemove).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  it('returns an error and skips cleanup when auth deletion fails', async () => {
    mockDeleteUser.mockResolvedValue({ error: new Error('Admin API error') });

    const result = await deleteAccount(testUserId);

    expect(result).toEqual({ ok: false, error: 'failed_to_delete_auth_user' });
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  describe('profile anonymisation', () => {
    it('NULLs all PII columns, including x / instagram / youtube', async () => {
      await deleteAccount(testUserId);

      const values = mockSet.mock.calls[0][0];

      for (const column of PROFILE_PII_COLUMNS) {
        expect(values[column]).toBeNull();
      }
      expect(values.xUsername).toBeNull();
      expect(values.instagramUsername).toBeNull();
      expect(values.youtubeHandle).toBeNull();
    });

    it('does not touch username or bannedAt', async () => {
      await deleteAccount(testUserId);

      const values = mockSet.mock.calls[0][0];
      expect('username' in values).toBe(false);
      expect('bannedAt' in values).toBe(false);
      expect('id' in values).toBe(false);
      expect('createdAt' in values).toBe(false);
    });

    it('stamps deletedAt and updatedAt', async () => {
      await deleteAccount(testUserId);

      const values = mockSet.mock.calls[0][0];
      expect(values.deletedAt).toBeInstanceOf(Date);
      expect(values.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('activity log', () => {
    it('does not record a delete_account activity event', async () => {
      await deleteAccount(testUserId);

      expect(mockLogActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('received likes (獲得したいいね) deletion', () => {
    /** Read back the `target_type` each `db.delete(likes).where(...)` scoped to. */
    const deletedTargetTypes = () =>
      mockDeleteWhere.mock.calls.map((call) => {
        const cond = call[0] as { __and: { __eq: [unknown, unknown] }[] };
        return cond.__and[0].__eq[1];
      });

    it('deletes received likes for every likeable owned-content type', async () => {
      await deleteAccount(testUserId);

      // Every target_type a user can own + receive likes on. If a new likeable
      // entity is added, this list (and LIKEABLE_OWNED_CONTENT) must grow.
      expect(deletedTargetTypes()).toEqual([
        'topic_post',
        'position',
        'chunk',
        'repertoire',
        'game',
        'game_comment',
      ]);
    });

    it('scopes each deletion to content owned by the withdrawing user', async () => {
      await deleteAccount(testUserId);

      // The owned-content subquery selects ids from the content table filtered
      // by its owner column = the withdrawing user.
      const ownerPredicates = mockSelectWhere.mock.calls.map(
        (call) => (call as unknown as [{ __eq: [unknown, unknown] }])[0].__eq
      );
      expect(ownerPredicates).toEqual([
        ['topicPosts.userId', testUserId],
        ['positions.userId', testUserId],
        ['chunks.userId', testUserId],
        ['repertoires.userId', testUserId],
        ['games.authorId', testUserId],
        ['gameComments.authorId', testUserId],
      ]);
    });

    it('deletes from the likes table, fed by the owned-content subquery', async () => {
      await deleteAccount(testUserId);

      // Each delete targets `likes`, matching target_id ∈ the owned-content
      // subquery (the "given" likes — user_id-keyed — are left untouched).
      expect(mockDelete).toHaveBeenCalledTimes(6);
      for (const call of mockDeleteWhere.mock.calls) {
        const cond = call[0] as { __and: { __inArray: [unknown, unknown] }[] };
        expect(cond.__and[1].__inArray).toEqual(['likes.targetId', 'owned-content-subquery']);
      }
    });
  });

  describe('draft chunk cleanup', () => {
    // The chunks soft-delete is the UPDATE that stamps only `deletedAt` (the
    // profile anonymisation UPDATE also stamps `updatedAt`).
    const draftChunkUpdate = () =>
      mockSet.mock.calls.find((c) => 'deletedAt' in c[0] && !('updatedAt' in c[0]));
    const draftChunkWhere = () =>
      mockWhere.mock.calls
        .map((c) => c[0] as { __and?: { __eq?: [unknown, unknown]; __isNull?: unknown }[] })
        .find((w) => w.__and?.some((p) => p.__eq?.[0] === 'chunks.status'));

    it('soft-deletes only the withdrawing user’s draft chunks', async () => {
      await deleteAccount(testUserId);

      // Stamps deletedAt (soft delete), not a hard DELETE.
      expect(draftChunkUpdate()?.[0]).toEqual({ deletedAt: expect.any(Date) });

      // Scoped to user_id = caller AND status = 'draft' AND not already deleted,
      // so published chunks (and other users') are untouched.
      const where = draftChunkWhere();
      expect(where?.__and).toEqual([
        { __eq: ['chunks.userId', testUserId] },
        { __eq: ['chunks.status', 'draft'] },
        { __isNull: 'chunks.deletedAt' },
      ]);
    });

    it('does not soft-delete drafts when auth deletion fails', async () => {
      mockDeleteUser.mockResolvedValue({ error: new Error('Admin API error') });

      await deleteAccount(testUserId);

      expect(draftChunkUpdate()).toBeUndefined();
    });
  });

  describe('avatar storage cleanup', () => {
    it('removes the avatar file(s) from Storage', async () => {
      await deleteAccount(testUserId);

      expect(mockRemove).toHaveBeenCalledWith([`${testUserId}/avatar.webp`]);
    });

    it('skips remove when there are no avatar files', async () => {
      mockList.mockResolvedValue({ data: [] });

      await deleteAccount(testUserId);

      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('still succeeds when Storage removal throws (best-effort)', async () => {
      mockList.mockRejectedValue(new Error('Storage down'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await deleteAccount(testUserId);

      expect(result).toEqual({ ok: true });
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
