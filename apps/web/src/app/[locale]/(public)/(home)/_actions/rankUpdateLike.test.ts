import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toggleRankUpdateLikeAction } from './rankUpdateLike';

const mockGetOwner = vi.fn();
vi.mock('../_lib/rank-update-owner', () => ({
  getLiveRankUpdateOwner: (...args: unknown[]) => mockGetOwner(...args),
}));

const mockToggle = vi.fn();
vi.mock('@/lib/db/like-actions', () => ({
  performEntityToggleLike: (...args: unknown[]) => mockToggle(...args),
}));

vi.mock('@/lib/server-action-error', () => ({
  handleServerActionError: () => ({ success: false, error: 'unexpected_error' }),
}));

const FEED_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toggleRankUpdateLikeAction', () => {
  it('asks the factory to refuse a card the feed no longer shows', async () => {
    mockGetOwner.mockResolvedValue(null);
    mockToggle.mockResolvedValue({ error: 'notFound' });

    expect(await toggleRankUpdateLikeAction(FEED_ID, 'en')).toEqual({ error: 'notFound' });
    const params = mockToggle.mock.calls[0][0];
    expect(params.missingTarget).toBe('reject');
    expect(await params.fetchOwner(FEED_ID)).toBeNull();
    expect(mockGetOwner).toHaveBeenCalledWith(FEED_ID);
  });

  it('likes the feed row and notifies the player with the leaderboard it names', async () => {
    mockGetOwner.mockResolvedValue({
      actorId: 'player-1',
      menuType: 'coordinate_quiz',
      leaderboardKey: 'white',
    });
    mockToggle.mockResolvedValue({ liked: true, likeCount: 1 });

    expect(await toggleRankUpdateLikeAction(FEED_ID, 'en')).toEqual({ liked: true, likeCount: 1 });
    const params = mockToggle.mock.calls[0][0];
    expect(params).toMatchObject({ id: FEED_ID, targetType: 'challenge_rank_update' });

    const owner = await params.fetchOwner(FEED_ID);
    expect(owner.userId).toBe('player-1');
    expect(params.notificationMeta(FEED_ID, owner.extra)).toEqual({
      menuType: 'coordinate_quiz',
      leaderboardKey: 'white',
    });
  });

  it('does not query the database before handing over to the guarded factory', async () => {
    mockToggle.mockResolvedValue({ error: 'invalidFeedItemId' });

    expect(await toggleRankUpdateLikeAction('nope', 'en')).toEqual({ error: 'invalidFeedItemId' });
    expect(mockGetOwner).not.toHaveBeenCalled();
  });
});
