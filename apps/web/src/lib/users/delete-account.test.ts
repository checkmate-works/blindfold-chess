import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PROFILE_PII_COLUMNS, deleteAccount } from './delete-account';

const mockDeleteUser = vi.fn();
const mockList = vi.fn();
const mockRemove = vi.fn();
const mockLogActivityEvent = vi.fn();

const mockSet = vi.fn();
const mockWhere = vi.fn().mockResolvedValue(undefined);

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    update: () => ({
      set: (values: Record<string, unknown>) => {
        mockSet(values);
        return { where: mockWhere };
      },
    }),
  },
  profiles: { id: 'id' },
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
  });

  it('soft-deletes the auth user first', async () => {
    const result = await deleteAccount(testUserId);

    expect(result).toEqual({ ok: true });
    expect(mockDeleteUser).toHaveBeenCalledWith(testUserId, true);
  });

  it('returns an error and skips cleanup when auth deletion fails', async () => {
    mockDeleteUser.mockResolvedValue({ error: new Error('Admin API error') });

    const result = await deleteAccount(testUserId);

    expect(result).toEqual({ ok: false, error: 'failed_to_delete_auth_user' });
    expect(mockSet).not.toHaveBeenCalled();
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
