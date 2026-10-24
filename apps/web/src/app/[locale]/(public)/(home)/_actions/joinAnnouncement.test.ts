import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteJoinAnnouncementAction, toggleJoinAnnouncementLikeAction } from './joinAnnouncement';

const mockGetOwner = vi.fn();
const mockDeleteOwn = vi.fn();
vi.mock('@/lib/feed-items/member-joined-mutations', () => ({
  getJoinAnnouncementOwnerId: (...args: unknown[]) => mockGetOwner(...args),
  deleteOwnJoinAnnouncement: (...args: unknown[]) => mockDeleteOwn(...args),
}));

const mockToggle = vi.fn();
vi.mock('@/lib/db/like-actions', () => ({
  performEntityToggleLike: (...args: unknown[]) => mockToggle(...args),
}));

const mockGuard = vi.fn();
vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockGuard(...args),
}));

vi.mock('@/lib/server-action-error', () => ({
  handleServerActionError: () => ({ success: false, error: 'unexpected_error' }),
}));

const FEED_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toggleJoinAnnouncementLikeAction', () => {
  it('asks the factory to refuse a card that no longer exists', async () => {
    // The existence check lives in `fetchOwner`, behind the factory's guard,
    // so a signed-out or rate-limited caller never costs a query. The
    // factory's own test covers what `missingTarget: 'reject'` does with it.
    mockGetOwner.mockResolvedValue(null);
    mockToggle.mockResolvedValue({ error: 'notFound' });

    expect(await toggleJoinAnnouncementLikeAction(FEED_ID, 'en')).toEqual({ error: 'notFound' });
    const params = mockToggle.mock.calls[0][0];
    expect(params.missingTarget).toBe('reject');
    expect(await params.fetchOwner(FEED_ID)).toBeNull();
    expect(mockGetOwner).toHaveBeenCalledWith(FEED_ID);
  });

  it('likes the feed row and names the member who joined as the owner to notify', async () => {
    mockGetOwner.mockResolvedValue('member-1');
    mockToggle.mockResolvedValue({ liked: true, likeCount: 1 });

    expect(await toggleJoinAnnouncementLikeAction(FEED_ID, 'en')).toEqual({
      liked: true,
      likeCount: 1,
    });
    const params = mockToggle.mock.calls[0][0];
    expect(params).toMatchObject({ id: FEED_ID, targetType: 'member_joined' });
    expect(await params.fetchOwner(FEED_ID)).toEqual({ userId: 'member-1', extra: null });
  });

  it('does not query the database before handing over to the guarded factory', async () => {
    mockToggle.mockResolvedValue({ error: 'invalidFeedItemId' });

    expect(await toggleJoinAnnouncementLikeAction('nope', 'en')).toEqual({
      error: 'invalidFeedItemId',
    });
    expect(mockGetOwner).not.toHaveBeenCalled();
  });
});

describe('deleteJoinAnnouncementAction', () => {
  it('deletes only as the signed-in member', async () => {
    mockGuard.mockResolvedValue({ user: { id: 'member-1' } });
    mockDeleteOwn.mockResolvedValue(true);

    expect(await deleteJoinAnnouncementAction(FEED_ID)).toEqual({ success: true });
    expect(mockDeleteOwn).toHaveBeenCalledWith('member-1', FEED_ID);
  });

  it('reports notFound when the card is not the caller’s (or is gone)', async () => {
    mockGuard.mockResolvedValue({ user: { id: 'someone-else' } });
    mockDeleteOwn.mockResolvedValue(false);

    expect(await deleteJoinAnnouncementAction(FEED_ID)).toEqual({ error: 'notFound' });
  });

  it('passes the guard error through for a signed-out caller', async () => {
    mockGuard.mockResolvedValue({ error: 'signInRequired' });

    expect(await deleteJoinAnnouncementAction(FEED_ID)).toEqual({ error: 'signInRequired' });
    expect(mockDeleteOwn).not.toHaveBeenCalled();
  });
});
