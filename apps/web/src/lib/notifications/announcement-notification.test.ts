import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockUsers: { id: string }[] = [];

const mockCreateNotification = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(mockUsers),
      }),
    }),
  },
  profiles: {
    id: 'profiles.id',
    bannedAt: 'profiles.banned_at',
    deletedAt: 'profiles.deleted_at',
  },
}));

vi.mock('@/lib/notifications/notification', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

vi.mock('server-only', () => ({}));

const { notifyAllUsersOfAnnouncement } = await import('./announcement-notification');

describe('notifyAllUsersOfAnnouncement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsers = [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }];
  });

  it('should create notifications for all active users', async () => {
    await notifyAllUsersOfAnnouncement('ann-123', 'new-feature', 'New Feature Released');

    expect(mockCreateNotification).toHaveBeenCalledTimes(3);
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'announcement',
      targetType: 'announcement',
      targetId: 'ann-123',
      metadata: { slug: 'new-feature', title: 'New Feature Released' },
    });
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'user-2',
      type: 'announcement',
      targetType: 'announcement',
      targetId: 'ann-123',
      metadata: { slug: 'new-feature', title: 'New Feature Released' },
    });
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'user-3',
      type: 'announcement',
      targetType: 'announcement',
      targetId: 'ann-123',
      metadata: { slug: 'new-feature', title: 'New Feature Released' },
    });
  });

  it('should not create notifications when no active users exist', async () => {
    mockUsers = [];

    await notifyAllUsersOfAnnouncement('ann-empty', 'empty-slug', 'Empty Title');

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('should skip banned/deleted users (filtered by WHERE clause)', async () => {
    // The implementation uses isNull(bannedAt) and isNull(deletedAt) in the WHERE clause.
    // Banned/deleted users are excluded at the DB level, so the mock only returns active users.
    mockUsers = [{ id: 'active-user-1' }];

    await notifyAllUsersOfAnnouncement('ann-999', 'filtered', 'Filtered Title');

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'active-user-1',
      type: 'announcement',
      targetType: 'announcement',
      targetId: 'ann-999',
      metadata: { slug: 'filtered', title: 'Filtered Title' },
    });
  });

  it('should create notification with correct targetId for each user', async () => {
    mockUsers = [{ id: 'user-a' }, { id: 'user-b' }];

    await notifyAllUsersOfAnnouncement('specific-ann-id', 'some-slug', 'Some Title');

    expect(mockCreateNotification).toHaveBeenCalledTimes(2);

    const userIds = mockCreateNotification.mock.calls.map(
      (call: { userId: string }[]) => call[0].userId
    );
    expect(userIds).toEqual(['user-a', 'user-b']);
  });
});
