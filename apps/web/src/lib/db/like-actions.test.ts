import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockUserHasProfile = vi.fn(async () => true);
const mockToggleByInsert = vi.fn();
const mockCountRows = vi.fn();
const mockAssertNotBlocked = vi.fn();
const mockCreateNotification = vi.fn();
const mockLogActivityEvent = vi.fn();
const mockFetchOwner = vi.fn();

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
  // Composed rather than stubbed flat, exactly as the real helper composes it:
  // the plain guard first, then the `profiles` lookup.
  authenticateGuardAndRequireProfile: async (...args: unknown[]) => {
    const guardResult = await mockAuthenticateAndGuard(...args);
    if ('error' in guardResult) return guardResult;
    return (await mockUserHasProfile()) ? guardResult : { error: 'profileRequired' };
  },
}));

vi.mock('./toggle-by-insert', () => ({
  toggleByInsert: (...args: unknown[]) => mockToggleByInsert(...args),
}));

vi.mock('@/lib/db/list-query', () => ({
  countRows: (...args: unknown[]) => mockCountRows(...args),
}));

vi.mock('@/lib/moderation/block', () => ({
  assertNotBlocked: (...args: unknown[]) => mockAssertNotBlocked(...args),
}));

vi.mock('@/lib/notifications/notification', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivityEvent(...args),
}));

vi.mock('./index', () => ({
  db: {
    insert: () => ({ values: () => Promise.resolve() }),
    delete: () => ({ where: () => Promise.resolve() }),
  },
  likes: { userId: 'user_id', targetType: 'target_type', targetId: 'target_id' },
}));

const TEST_USER_ID = 'user-00000000-0000-0000-0000-000000000001';
const TARGET_OWNER_ID = 'user-00000000-0000-0000-0000-000000000002';
const TARGET_ID = '11111111-2222-3333-4444-555555555555';

const baseParams = {
  id: TARGET_ID,
  fieldName: 'chunkId',
  targetType: 'chunk',
  fetchOwner: (id: string) => mockFetchOwner(id),
  notificationMeta: () => ({}),
};

describe('performEntityToggleLike', () => {
  beforeEach(() => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockFetchOwner.mockResolvedValue({ userId: TARGET_OWNER_ID, extra: undefined });
    mockAssertNotBlocked.mockResolvedValue(null);
    mockToggleByInsert.mockResolvedValue(true);
    mockCountRows.mockResolvedValue(1);
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { performEntityToggleLike } = await import('./like-actions');
    const result = await performEntityToggleLike(baseParams);

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockToggleByInsert).not.toHaveBeenCalled();
  });

  it('rejects a provisional liker with profileRequired before the like lands', async () => {
    mockUserHasProfile.mockResolvedValueOnce(false);

    const { performEntityToggleLike } = await import('./like-actions');
    const result = await performEntityToggleLike(baseParams);

    // A like names its author in the owner's notification, so it must not be
    // written by a user with no profile row to name them.
    expect(result).toEqual({ error: 'profileRequired' });
    expect(mockToggleByInsert).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('rejects a malformed target id before touching auth', async () => {
    const { performEntityToggleLike } = await import('./like-actions');
    const result = await performEntityToggleLike({ ...baseParams, id: 'not-a-uuid' });

    expect(result).toEqual({ error: 'invalidChunkId' });
    expect(mockAuthenticateAndGuard).not.toHaveBeenCalled();
  });

  it('toggles the like and reports the new count for a registered member', async () => {
    const { performEntityToggleLike } = await import('./like-actions');
    const result = await performEntityToggleLike(baseParams);

    expect(result).toEqual({ liked: true, likeCount: 1 });
    expect(mockToggleByInsert).toHaveBeenCalled();
  });
});
