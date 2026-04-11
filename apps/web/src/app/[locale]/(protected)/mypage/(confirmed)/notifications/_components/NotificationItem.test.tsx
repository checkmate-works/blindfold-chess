import { NOTIFICATIONS_READ_EVENT } from '@/config';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationWithActor } from '../_lib/queries';
import { NotificationItem } from './NotificationItem';

afterEach(() => {
  cleanup();
});

const mockMarkAsRead = vi.fn();

vi.mock('../_actions', () => ({
  markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
}));

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string, params?: Record<string, string>) => {
    if (key === 'followMessage' && params) return `${params.actor} followed you`;
    if (key === 'likeMessage' && params) return `${params.actor} liked your post`;
    if (key === 'replyMessage' && params) return `${params.actor} replied to your post`;
    if (key === 'newPostMessage' && params) return `${params.actor} shared a new post`;
    if (key === 'achievementSingleMessage' && params) return `🏆 You earned ${params.name}`;
    if (key === 'achievementMultipleMessage' && params)
      return `🏆 You earned ${params.count} achievements`;
    return key;
  },
}));

vi.mock('@/i18n/use-safe-locale', () => ({
  useSafeLocale: () => 'en',
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    children,
    onClick,
    className,
  }: {
    href: string;
    locale?: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

function createNotification(overrides: Partial<NotificationWithActor> = {}): NotificationWithActor {
  return {
    id: 'notif-1',
    type: 'follow',
    targetType: null,
    targetId: null,
    groupKey: null,
    metadata: {},
    isRead: false,
    createdAt: new Date('2025-01-01'),
    actor: {
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
    },
    ...overrides,
  };
}

describe('NotificationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarkAsRead.mockResolvedValue(undefined);
  });

  it('should dispatch NOTIFICATIONS_READ_EVENT after marking as read', async () => {
    const eventSpy = vi.fn();
    window.addEventListener(NOTIFICATIONS_READ_EVENT, eventSpy);

    const notification = createNotification({ isRead: false });

    render(<NotificationItem notification={notification} />);

    const link = screen.getByText('Alice followed you').closest('a')!;
    fireEvent.click(link);

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1');
    });

    await waitFor(() => {
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    window.removeEventListener(NOTIFICATIONS_READ_EVENT, eventSpy);
  });

  it('should not dispatch event when notification is already read', () => {
    const eventSpy = vi.fn();
    window.addEventListener(NOTIFICATIONS_READ_EVENT, eventSpy);

    const notification = createNotification({ isRead: true });

    render(<NotificationItem notification={notification} />);

    const link = screen.getByText('Alice followed you').closest('a')!;
    fireEvent.click(link);

    expect(mockMarkAsRead).not.toHaveBeenCalled();
    expect(eventSpy).not.toHaveBeenCalled();

    window.removeEventListener(NOTIFICATIONS_READ_EVENT, eventSpy);
  });

  it('should call router.refresh after marking as read', async () => {
    const notification = createNotification({ isRead: false });

    render(<NotificationItem notification={notification} />);

    const link = screen.getByText('Alice followed you').closest('a')!;
    fireEvent.click(link);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should not call router.refresh when notification is already read', () => {
    const notification = createNotification({ isRead: true });

    render(<NotificationItem notification={notification} />);

    const link = screen.getByText('Alice followed you').closest('a')!;
    fireEvent.click(link);

    expect(mockMarkAsRead).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('should call markAsRead with correct notification id', async () => {
    const notification = createNotification({ id: 'notif-42', isRead: false });

    render(<NotificationItem notification={notification} />);

    const link = screen.getByText('Alice followed you').closest('a')!;
    fireEvent.click(link);

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith('notif-42');
    });

    expect(mockMarkAsRead).toHaveBeenCalledTimes(1);
  });

  describe('new_post notification', () => {
    it('should display the correct message for new_post type', () => {
      const notification = createNotification({
        type: 'new_post',
        metadata: { topicType: 'opening', topicKey: 'sicilian-defense', postId: 'post-1' },
      });

      render(<NotificationItem notification={notification} />);

      expect(screen.getByText('Alice shared a new post')).toBeDefined();
    });

    it('should link to /topics/openings/{topicKey}/posts/{postId} for opening metadata', () => {
      const notification = createNotification({
        type: 'new_post',
        metadata: { topicType: 'opening', topicKey: 'sicilian-defense', postId: 'post-1' },
      });

      render(<NotificationItem notification={notification} />);

      const link = screen.getByText('Alice shared a new post').closest('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('/topics/openings/sicilian-defense/posts/post-1');
    });

    it('should link to /topics/squares/{topicKey}/posts/{postId} for square metadata', () => {
      const notification = createNotification({
        type: 'new_post',
        metadata: { topicType: 'square', topicKey: 'e4', postId: 'post-42' },
      });

      render(<NotificationItem notification={notification} />);

      const link = screen.getByText('Alice shared a new post').closest('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('/topics/squares/e4/posts/post-42');
    });
  });

  describe('reply notification', () => {
    it('should display the correct message for reply type', () => {
      const notification = createNotification({
        type: 'reply',
        metadata: { topicType: 'opening', topicKey: 'sicilian-defense', postId: 'post-1' },
      });

      render(<NotificationItem notification={notification} />);

      expect(screen.getByText('Alice replied to your post')).toBeDefined();
    });

    it('should link to /topics/openings/{topicKey}/posts/{postId} for opening metadata', () => {
      const notification = createNotification({
        type: 'reply',
        metadata: { topicType: 'opening', topicKey: 'sicilian-defense', postId: 'post-1' },
      });

      render(<NotificationItem notification={notification} />);

      const link = screen.getByText('Alice replied to your post').closest('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('/topics/openings/sicilian-defense/posts/post-1');
    });

    it('should link to /topics/squares/{topicKey}/posts/{postId} for square metadata', () => {
      const notification = createNotification({
        type: 'reply',
        metadata: { topicType: 'square', topicKey: 'e4', postId: 'post-42' },
      });

      render(<NotificationItem notification={notification} />);

      const link = screen.getByText('Alice replied to your post').closest('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('/topics/squares/e4/posts/post-42');
    });

    it('should link to post with #reply-{replyId} fragment when metadata includes replyId', () => {
      const notification = createNotification({
        type: 'reply',
        metadata: {
          topicType: 'opening',
          topicKey: 'sicilian-defense',
          postId: 'post-1',
          replyId: 'reply-99',
        },
      });

      render(<NotificationItem notification={notification} />);

      const link = screen.getByText('Alice replied to your post').closest('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe(
        '/topics/openings/sicilian-defense/posts/post-1#reply-reply-99'
      );
    });

    it('should link to square post with #reply-{replyId} fragment when metadata includes replyId', () => {
      const notification = createNotification({
        type: 'reply',
        metadata: { topicType: 'square', topicKey: 'e4', postId: 'post-42', replyId: 'reply-7' },
      });

      render(<NotificationItem notification={notification} />);

      const link = screen.getByText('Alice replied to your post').closest('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('/topics/squares/e4/posts/post-42#reply-reply-7');
    });

    it('should render as button when metadata is missing', () => {
      const notification = createNotification({
        type: 'reply',
        metadata: {},
      });

      render(<NotificationItem notification={notification} />);

      const button = screen.getByRole('button');
      expect(button).toBeDefined();
    });
  });

  describe('like notification with isPostMetadata rename', () => {
    it('should display the correct message for like type', () => {
      const notification = createNotification({
        type: 'like',
        metadata: { topicType: 'square', topicKey: 'e4', postId: 'post-1' },
      });

      render(<NotificationItem notification={notification} />);

      expect(screen.getByText('Alice liked your post')).toBeDefined();
    });

    it('should link to the correct post for like type with post metadata', () => {
      const notification = createNotification({
        type: 'like',
        metadata: { topicType: 'square', topicKey: 'd5', postId: 'post-99' },
      });

      render(<NotificationItem notification={notification} />);

      const link = screen.getByText('Alice liked your post').closest('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('/topics/squares/d5/posts/post-99');
    });

    it('should link to /practice/position-memory/{id} for like on a position (from metadata.positionId)', () => {
      const notification = createNotification({
        type: 'like',
        targetType: 'position',
        targetId: 'pos-abc',
        metadata: { positionId: 'pos-abc' },
      });

      render(<NotificationItem notification={notification} />);

      const link = screen.getByText('Alice liked your post').closest('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('/practice/position-memory/pos-abc');
    });

    it('should fall back to targetId when metadata is missing for a position like', () => {
      const notification = createNotification({
        type: 'like',
        targetType: 'position',
        targetId: 'pos-xyz',
        metadata: {},
      });

      render(<NotificationItem notification={notification} />);

      const link = screen.getByText('Alice liked your post').closest('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('/practice/position-memory/pos-xyz');
    });

    it('should render as button when both metadata and targetId are missing for a position like', () => {
      const notification = createNotification({
        type: 'like',
        targetType: 'position',
        targetId: null,
        metadata: {},
        isRead: false,
      });

      render(<NotificationItem notification={notification} />);

      // No link should be rendered — should fall back to a button that only marks as read
      const button = screen.getByRole('button');
      expect(button).toBeDefined();
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('should still mark as read (no navigation) when position like has no metadata/targetId', async () => {
      const notification = createNotification({
        id: 'notif-pl-1',
        type: 'like',
        targetType: 'position',
        targetId: null,
        metadata: {},
        isRead: false,
      });

      render(<NotificationItem notification={notification} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockMarkAsRead).toHaveBeenCalledWith('notif-pl-1');
      });
    });

    it('should render as button for a like with an unknown targetType and non-post metadata', () => {
      const notification = createNotification({
        type: 'like',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        targetType: 'unknown_target' as any,
        targetId: 'some-id',
        metadata: { foo: 'bar' },
      });

      render(<NotificationItem notification={notification} />);

      // Unknown targetType + non-post metadata → no link
      const button = screen.getByRole('button');
      expect(button).toBeDefined();
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('should still render link but not mark as read when a position like is already read', () => {
      const notification = createNotification({
        type: 'like',
        targetType: 'position',
        targetId: 'pos-read',
        metadata: { positionId: 'pos-read' },
        isRead: true,
      });

      render(<NotificationItem notification={notification} />);

      const link = screen.getByText('Alice liked your post').closest('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('/practice/position-memory/pos-read');

      fireEvent.click(link!);
      expect(mockMarkAsRead).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('should not render the unread indicator dot when a position like is already read', () => {
      const notification = createNotification({
        type: 'like',
        targetType: 'position',
        targetId: 'pos-read-2',
        metadata: { positionId: 'pos-read-2' },
        isRead: true,
      });

      const { container } = render(<NotificationItem notification={notification} />);

      // The unread dot uses bg-link-primary; when read, it must not exist
      const dot = container.querySelector('.bg-link-primary');
      expect(dot).toBeNull();
    });
  });

  describe('achievement_granted notification', () => {
    it('should display single badge name when one badge is granted', () => {
      const notification = createNotification({
        type: 'achievement_granted',
        actor: null,
        metadata: {
          badges: [
            {
              slug: 'monthly-coordinate_quiz-white-1st',
              menuType: 'coordinate_quiz',
              leaderboardKey: 'white',
              placement: 1,
            },
          ],
          year: 2026,
          month: 3,
        },
      });

      render(<NotificationItem notification={notification} currentUsername="testuser" />);

      expect(screen.getByText('🏆 You earned Monthly Coordinate Quiz White 1st')).toBeDefined();
    });

    it('should display aggregated message when multiple badges are granted', () => {
      const notification = createNotification({
        type: 'achievement_granted',
        actor: null,
        metadata: {
          badges: [
            {
              slug: 'monthly-coordinate_quiz-white-1st',
              menuType: 'coordinate_quiz',
              leaderboardKey: 'white',
              placement: 1,
            },
            {
              slug: 'monthly-coordinate_quiz-black-1st',
              menuType: 'coordinate_quiz',
              leaderboardKey: 'black',
              placement: 1,
            },
          ],
          year: 2026,
          month: 3,
        },
      });

      render(<NotificationItem notification={notification} currentUsername="testuser" />);

      expect(screen.getByText('🏆 You earned 2 achievements')).toBeDefined();
    });

    it('should link to achievements page when currentUsername is provided', () => {
      const notification = createNotification({
        type: 'achievement_granted',
        actor: null,
        metadata: {
          badges: [
            {
              slug: 'monthly-coordinate_quiz-white-1st',
              menuType: 'coordinate_quiz',
              leaderboardKey: 'white',
              placement: 1,
            },
          ],
          year: 2026,
          month: 3,
        },
      });

      render(<NotificationItem notification={notification} currentUsername="testuser" />);

      const link = screen.getByText('🏆 You earned Monthly Coordinate Quiz White 1st').closest('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('/u/testuser/achievements');
    });

    it('should render as button when currentUsername is not provided', () => {
      const notification = createNotification({
        type: 'achievement_granted',
        actor: null,
        metadata: {
          badges: [
            {
              slug: 'monthly-coordinate_quiz-white-1st',
              menuType: 'coordinate_quiz',
              leaderboardKey: 'white',
              placement: 1,
            },
          ],
          year: 2026,
          month: 3,
        },
      });

      render(<NotificationItem notification={notification} />);

      const button = screen.getByRole('button');
      expect(button).toBeDefined();
    });

    it('should show trophy icon for achievement_granted type', () => {
      const notification = createNotification({
        type: 'achievement_granted',
        actor: null,
        metadata: {
          badges: [
            {
              slug: 'monthly-coordinate_quiz-white-1st',
              menuType: 'coordinate_quiz',
              leaderboardKey: 'white',
              placement: 1,
            },
          ],
          year: 2026,
          month: 3,
        },
      });

      const { container } = render(
        <NotificationItem notification={notification} currentUsername="testuser" />
      );

      // The trophy icon should be rendered (HiTrophy from react-icons)
      const svgElement = container.querySelector('svg');
      expect(svgElement).not.toBeNull();
    });
  });
});
