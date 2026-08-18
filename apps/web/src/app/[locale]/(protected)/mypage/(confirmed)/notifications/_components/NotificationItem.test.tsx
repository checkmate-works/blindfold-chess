import { NOTIFICATIONS_READ_EVENT } from '@/config';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationWithActor } from '../_lib/queries';
import { NotificationItem } from './NotificationItem';

const mockMarkAsRead = vi.fn();
const mockSetNotificationMute = vi.fn();

vi.mock('../_actions', () => ({
  markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
  setNotificationMute: (...args: unknown[]) => mockSetNotificationMute(...args),
}));

// Link *values* are the helper's responsibility, exhaustively unit-tested in
// notification-link.test.ts. Mock it here so this test only verifies the
// component's own job — render a link vs. a non-link button and pass the href
// through — and never re-asserts URL strings (the duplication that let a stale
// chunk-comment assertion rot). `buildNotificationMessage` stays real so the
// message-text coverage (its only home) is preserved.
const mockBuildNotificationLink = vi.fn<(...args: unknown[]) => string | null>();
vi.mock('../_lib/notification-link', () => ({
  buildNotificationLink: (...args: unknown[]) => mockBuildNotificationLink(...args),
}));

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string, params?: Record<string, string>) => {
    if (key === 'followMessage' && params) return `${params.actor} followed you`;
    if (key === 'likeMessage' && params) return `${params.actor} liked your post`;
    if (key === 'likeCommentMessage' && params) return `${params.actor} liked your comment`;
    if (key === 'likeGameMessage' && params) return `${params.actor} liked your game`;
    if (key === 'replyMessage' && params) return `${params.actor} replied to your comment`;
    if (key === 'newPostMessage' && params) return `${params.actor} shared a new post`;
    if (key === 'chunkEditRequestSubmittedMessage' && params)
      return `${params.actor} suggested an edit to your chunk`;
    if (key === 'chunkEditRequestAcceptedMessage' && params)
      return `${params.actor} accepted your edit suggestion`;
    if (key === 'newChunkDraftMessage' && params) return `${params.actor} posted a chunk draft`;
    if (key === 'chunkPublishedMessage' && params) return `${params.actor} published a chunk`;
    if (key === 'achievementSingleMessage' && params) return `🏆 You earned ${params.name}`;
    if (key === 'achievementMultipleMessage' && params)
      return `🏆 You earned ${params.count} achievements`;
    if (key === 'muteButtonLabel' && params) return `Mute ${params.type} notifications`;
    if (key === 'unmuteButtonLabel' && params) return `Unmute ${params.type} notifications`;
    if (key === 'muteConfirmTitle') return 'Mute this notification type?';
    if (key === 'muteConfirmMessage' && params)
      return `You will no longer receive ${params.type} notifications.`;
    if (key === 'muteConfirmButton') return 'Mute';
    if (key === 'cancel') return 'Cancel';
    if (key === 'Preferences.notifications.types.new_position') return 'new_position';
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
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    className?: string;
  }) => (
    // Real Next.js <Link> intercepts the click and routes via the App Router,
    // so a full document navigation never reaches jsdom. Without preventDefault
    // here, jsdom queues a `setTimeout(0)` navigation that fires after the
    // test ends as "Not implemented: navigation to another Document".
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      className={className}
    >
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
    mockSetNotificationMute.mockResolvedValue(undefined);
    // Default: the helper yields a link, so the item renders as an anchor.
    mockBuildNotificationLink.mockReturnValue('/target');
  });

  describe('link vs. button rendering', () => {
    it('renders a link carrying the href returned by buildNotificationLink', () => {
      mockBuildNotificationLink.mockReturnValue('/games/shared/g1?comment=c1');

      render(<NotificationItem notification={createNotification()} />);

      const link = screen.getByText('Alice followed you').closest('a');
      expect(link).not.toBeNull();
      // The exact value is the helper's — the component just passes it through.
      expect(link!.getAttribute('href')).toBe('/games/shared/g1?comment=c1');
    });

    it('renders a non-link button when buildNotificationLink returns null', () => {
      mockBuildNotificationLink.mockReturnValue(null);

      render(<NotificationItem notification={createNotification()} />);

      expect(screen.queryByRole('link')).toBeNull();
      expect(screen.getByRole('button')).toBeDefined();
    });

    it('passes the notification and currentUsername through to the link helper', () => {
      const notification = createNotification({ id: 'notif-x' });

      render(<NotificationItem notification={notification} currentUsername="bob" />);

      expect(mockBuildNotificationLink).toHaveBeenCalledWith(notification, {
        currentUsername: 'bob',
      });
    });
  });

  describe('mark-as-read behavior', () => {
    it('dispatches NOTIFICATIONS_READ_EVENT after marking an unread item as read', async () => {
      const eventSpy = vi.fn();
      window.addEventListener(NOTIFICATIONS_READ_EVENT, eventSpy);

      render(<NotificationItem notification={createNotification({ isRead: false })} />);
      fireEvent.click(screen.getByText('Alice followed you').closest('a')!);

      await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1'));
      await waitFor(() => expect(eventSpy).toHaveBeenCalledTimes(1));

      window.removeEventListener(NOTIFICATIONS_READ_EVENT, eventSpy);
    });

    it('calls router.refresh after marking an unread item as read', async () => {
      render(<NotificationItem notification={createNotification({ isRead: false })} />);
      fireEvent.click(screen.getByText('Alice followed you').closest('a')!);

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    });

    it('marks as read with the correct notification id', async () => {
      render(
        <NotificationItem notification={createNotification({ id: 'notif-42', isRead: false })} />
      );
      fireEvent.click(screen.getByText('Alice followed you').closest('a')!);

      await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith('notif-42'));
      expect(mockMarkAsRead).toHaveBeenCalledTimes(1);
    });

    it('does nothing when an already-read item is clicked', () => {
      const eventSpy = vi.fn();
      window.addEventListener(NOTIFICATIONS_READ_EVENT, eventSpy);

      render(<NotificationItem notification={createNotification({ isRead: true })} />);
      fireEvent.click(screen.getByText('Alice followed you').closest('a')!);

      expect(mockMarkAsRead).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
      expect(eventSpy).not.toHaveBeenCalled();

      window.removeEventListener(NOTIFICATIONS_READ_EVENT, eventSpy);
    });

    it('marks as read from the non-link button variant too', async () => {
      mockBuildNotificationLink.mockReturnValue(null);

      render(
        <NotificationItem notification={createNotification({ id: 'notif-btn', isRead: false })} />
      );
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith('notif-btn'));
    });
  });

  describe('mute action', () => {
    it('does not render a mute button for a non-mutable type', () => {
      render(<NotificationItem notification={createNotification({ type: 'follow' })} />);

      expect(screen.queryByRole('button', { name: /^Mute .* notifications$/ })).toBeNull();
    });

    it('does not render a mute button for a legacy new_post notification', () => {
      render(<NotificationItem notification={createNotification({ type: 'new_post' })} />);

      expect(screen.queryByRole('button', { name: /^Mute .* notifications$/ })).toBeNull();
    });

    it('renders a mute button for a mutable type', () => {
      render(<NotificationItem notification={createNotification({ type: 'new_position' })} />);

      expect(screen.getByRole('button', { name: 'Mute new_position notifications' })).toBeDefined();
    });

    it('opens a confirmation dialog without marking as read or navigating', () => {
      render(
        <NotificationItem
          notification={createNotification({ type: 'new_position', isRead: false })}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Mute new_position notifications' }));

      expect(screen.getByText('Mute this notification type?')).toBeDefined();
      expect(mockMarkAsRead).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('calls setNotificationMute and swaps to an unmute button on confirm', async () => {
      render(<NotificationItem notification={createNotification({ type: 'new_position' })} />);

      fireEvent.click(screen.getByRole('button', { name: 'Mute new_position notifications' }));
      fireEvent.click(screen.getByText('Mute'));

      await waitFor(() =>
        expect(mockSetNotificationMute).toHaveBeenCalledWith('new_position', true)
      );
      // The icon stays a real, enabled button — this is the toggle, not a
      // one-way action that goes dead after the first click. isMuting only
      // settles back to false a render or two after the label itself
      // updates, so poll both together instead of asserting immediately.
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Unmute new_position notifications' })
        ).toBeEnabled();
      });
    });

    it('does not call setNotificationMute when the confirmation is cancelled', () => {
      render(<NotificationItem notification={createNotification({ type: 'new_position' })} />);

      fireEvent.click(screen.getByRole('button', { name: 'Mute new_position notifications' }));
      fireEvent.click(screen.getByText('Cancel'));

      expect(mockSetNotificationMute).not.toHaveBeenCalled();
      expect(screen.queryByText('Mute this notification type?')).toBeNull();
      expect(screen.getByRole('button', { name: 'Mute new_position notifications' })).toBeDefined();
    });

    it('unmutes immediately on click, with no confirmation dialog', async () => {
      render(
        <NotificationItem notification={createNotification({ type: 'new_position' })} isTypeMuted />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Unmute new_position notifications' }));

      // No dialog appears for the restorative direction.
      expect(screen.queryByText('Mute this notification type?')).toBeNull();
      await waitFor(() =>
        expect(mockSetNotificationMute).toHaveBeenCalledWith('new_position', false)
      );
      await screen.findByRole('button', { name: 'Mute new_position notifications' });
    });

    it('reflects the initial mute status from isTypeMuted on first render', () => {
      render(
        <NotificationItem notification={createNotification({ type: 'new_position' })} isTypeMuted />
      );

      expect(
        screen.getByRole('button', { name: 'Unmute new_position notifications' })
      ).toBeDefined();
      expect(screen.queryByRole('button', { name: 'Mute new_position notifications' })).toBeNull();
    });

    it('stays responsive across repeated mute/unmute cycles', async () => {
      render(<NotificationItem notification={createNotification({ type: 'new_position' })} />);

      // The icon button stays disabled while the previous cycle's
      // useTransition is pending — sometimes a beat longer than the label
      // swap — so wait for it to be clickable, not just present, or the
      // click silently no-ops under load.
      const clickWhenEnabled = async (name: string) => {
        await waitFor(() => {
          const button = screen.getByRole('button', { name }) as HTMLButtonElement;
          expect(button.disabled).toBe(false);
        });
        fireEvent.click(screen.getByRole('button', { name }));
      };

      await clickWhenEnabled('Mute new_position notifications');
      fireEvent.click(await screen.findByText('Mute'));
      await screen.findByRole('button', { name: 'Unmute new_position notifications' });

      await clickWhenEnabled('Unmute new_position notifications');
      await screen.findByRole('button', { name: 'Mute new_position notifications' });

      await clickWhenEnabled('Mute new_position notifications');
      fireEvent.click(await screen.findByText('Mute'));
      await screen.findByRole('button', { name: 'Unmute new_position notifications' });

      expect(mockSetNotificationMute).toHaveBeenNthCalledWith(1, 'new_position', true);
      expect(mockSetNotificationMute).toHaveBeenNthCalledWith(2, 'new_position', false);
      expect(mockSetNotificationMute).toHaveBeenNthCalledWith(3, 'new_position', true);
    });
  });

  describe('unread indicator', () => {
    it('renders the unread dot when unread', () => {
      const { container } = render(
        <NotificationItem notification={createNotification({ isRead: false })} />
      );
      expect(container.querySelector('.bg-link-primary')).not.toBeNull();
    });

    it('hides the unread dot when read', () => {
      const { container } = render(
        <NotificationItem notification={createNotification({ isRead: true })} />
      );
      expect(container.querySelector('.bg-link-primary')).toBeNull();
    });
  });

  // Message text is produced by buildNotificationMessage (kept real here — this
  // is its only test coverage). One case per distinct message.
  describe('message rendering', () => {
    it('renders the new_post message', () => {
      render(
        <NotificationItem
          notification={createNotification({
            type: 'new_post',
            metadata: { topicType: 'opening', topicKey: 'sicilian-defense', postId: 'post-1' },
          })}
        />
      );
      expect(screen.getByText('Alice shared a new post')).toBeDefined();
    });

    it('renders the reply message', () => {
      render(
        <NotificationItem
          notification={createNotification({
            type: 'reply',
            metadata: { topicType: 'opening', topicKey: 'sicilian-defense', postId: 'post-1' },
          })}
        />
      );
      expect(screen.getByText('Alice replied to your comment')).toBeDefined();
    });

    it('renders "liked your comment" for a topic_post like', () => {
      render(
        <NotificationItem
          notification={createNotification({
            type: 'like',
            targetType: 'topic_post',
            targetId: 'post-1',
            metadata: { topicType: 'square', topicKey: 'e4', postId: 'post-1' },
          })}
        />
      );
      expect(screen.getByText('Alice liked your comment')).toBeDefined();
    });

    it('renders "liked your game" for a game like', () => {
      render(
        <NotificationItem
          notification={createNotification({
            type: 'like',
            targetType: 'game',
            targetId: 'game-77',
            metadata: {},
          })}
        />
      );
      expect(screen.getByText('Alice liked your game')).toBeDefined();
    });

    it('renders "liked your post" for a post like', () => {
      render(
        <NotificationItem
          notification={createNotification({
            type: 'like',
            metadata: { topicType: 'square', topicKey: 'e4', postId: 'post-1' },
          })}
        />
      );
      expect(screen.getByText('Alice liked your post')).toBeDefined();
    });

    it('renders the chunk edit-request submitted / accepted messages', () => {
      const { rerender } = render(
        <NotificationItem
          notification={createNotification({
            type: 'chunk_edit_request_submitted',
            targetType: 'chunk_edit_request',
            targetId: 'req-1',
            metadata: { chunkId: 'chunk-1', slug: 'fianchetto' },
          })}
        />
      );
      expect(screen.getByText('Alice suggested an edit to your chunk')).toBeDefined();

      rerender(
        <NotificationItem
          notification={createNotification({
            type: 'chunk_edit_request_accepted',
            targetType: 'chunk_edit_request',
            targetId: 'req-2',
            metadata: { chunkId: 'chunk-2', slug: 'rook-battery' },
          })}
        />
      );
      expect(screen.getByText('Alice accepted your edit suggestion')).toBeDefined();
    });

    it('renders the chunk draft / published messages', () => {
      const { rerender } = render(
        <NotificationItem
          notification={createNotification({
            type: 'new_chunk_draft',
            targetType: 'chunk',
            targetId: 'chunk-draft-1',
            metadata: { chunkId: 'chunk-draft-1', slug: 'rook-battery', kind: 'created' },
          })}
        />
      );
      expect(screen.getByText('Alice posted a chunk draft')).toBeDefined();

      rerender(
        <NotificationItem
          notification={createNotification({
            type: 'chunk_published',
            targetType: 'chunk',
            targetId: 'chunk-pub-1',
            metadata: { chunkId: 'chunk-pub-1', slug: 'fianchetto', kind: 'published' },
          })}
        />
      );
      expect(screen.getByText('Alice published a chunk')).toBeDefined();
    });

    it('renders the single- and multi-badge achievement messages', () => {
      const badge = (leaderboardKey: string) => ({
        slug: `monthly-coordinate_quiz-${leaderboardKey}-1st`,
        menuType: 'coordinate_quiz',
        leaderboardKey,
        placement: 1,
      });

      const { rerender } = render(
        <NotificationItem
          notification={createNotification({
            type: 'achievement_granted',
            actor: null,
            metadata: { badges: [badge('white')], year: 2026, month: 3 },
          })}
          currentUsername="testuser"
        />
      );
      expect(screen.getByText('🏆 You earned Monthly Coordinate Quiz White 1st')).toBeDefined();

      rerender(
        <NotificationItem
          notification={createNotification({
            type: 'achievement_granted',
            actor: null,
            metadata: { badges: [badge('white'), badge('black')], year: 2026, month: 3 },
          })}
          currentUsername="testuser"
        />
      );
      expect(screen.getByText('🏆 You earned 2 achievements')).toBeDefined();
    });

    it('shows the trophy icon for an achievement notification', () => {
      const { container } = render(
        <NotificationItem
          notification={createNotification({
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
          })}
          currentUsername="testuser"
        />
      );
      expect(container.querySelector('svg')).not.toBeNull();
    });
  });
});
