import { NOTIFICATIONS_READ_EVENT } from '@/config';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationWithActor } from '../_actions';
import { NotificationItem } from './NotificationItem';

afterEach(() => {
  cleanup();
});

const mockMarkAsRead = vi.fn();

vi.mock('../_actions', () => ({
  markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    if (key === 'followMessage' && params) return `${params.actor} followed you`;
    if (key === 'likeMessage' && params) return `${params.actor} liked your post`;
    if (key === 'replyMessage' && params) return `${params.actor} replied to your post`;
    if (key === 'newPostMessage' && params) return `${params.actor} shared a new post`;
    return key;
  },
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
  });
});
