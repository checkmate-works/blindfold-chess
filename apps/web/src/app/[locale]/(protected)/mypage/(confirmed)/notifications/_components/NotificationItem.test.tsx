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
});
