import { NOTIFICATIONS_READ_EVENT } from '@/config';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationBadge } from './NotificationBadge';

const mockGetUnreadCount = vi.fn();
const mockUseAuth = vi.fn(() => ({
  user: { id: 'test-user' } as { id: string } | null,
  isLoading: false,
  session: null,
  signOut: vi.fn(),
  unreadNotificationCount: 0,
}));

vi.mock('@/app/[locale]/(protected)/mypage/(confirmed)/notifications/_actions', () => ({
  getUnreadCount: () => mockGetUnreadCount(),
}));

vi.mock('next-intl');

vi.mock('@/app/[locale]/_contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function seedSession(unreadNotificationCount: number) {
  mockUseAuth.mockReturnValue({
    user: { id: 'test-user' },
    isLoading: false,
    session: null,
    signOut: vi.fn(),
    unreadNotificationCount,
  });
}

describe('NotificationBadge', () => {
  beforeEach(() => {
    mockGetUnreadCount.mockReset();
    seedSession(0);
  });

  describe('count seeded from the session', () => {
    it('displays the count the session resolved, without a request of its own', () => {
      seedSession(5);

      render(<NotificationBadge />);

      expect(screen.getByText('5')).toBeInTheDocument();
      // The whole point of reading the count off the session: mounting the
      // bell must not cost a Server Action call.
      expect(mockGetUnreadCount).not.toHaveBeenCalled();
    });

    it('does not display a badge when the count is 0', () => {
      seedSession(0);

      render(<NotificationBadge />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('displays 1 at the minimum boundary', () => {
      seedSession(1);

      render(<NotificationBadge />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('displays exactly 99 without truncation', () => {
      seedSession(99);

      render(<NotificationBadge />);

      expect(screen.getByText('99')).toBeInTheDocument();
      expect(screen.queryByText('99+')).not.toBeInTheDocument();
    });

    it('displays 99+ for exactly 100', () => {
      seedSession(100);

      render(<NotificationBadge />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('displays 99+ when the count exceeds 99', () => {
      seedSession(150);

      render(<NotificationBadge />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('re-seeds when the session resolves a new count (refreshUser)', () => {
      seedSession(5);

      const { rerender } = render(<NotificationBadge />);

      expect(screen.getByText('5')).toBeInTheDocument();

      seedSession(2);
      rerender(<NotificationBadge />);

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(mockGetUnreadCount).not.toHaveBeenCalled();
    });

    it('does not refetch when re-rendered with an unchanged session count', () => {
      seedSession(5);

      const { rerender } = render(<NotificationBadge />);

      rerender(<NotificationBadge />);
      rerender(<NotificationBadge />);

      expect(screen.getByText('5')).toBeInTheDocument();
      // A re-render is what a soft navigation looks like to this component;
      // it must not turn into a POST.
      expect(mockGetUnreadCount).not.toHaveBeenCalled();
    });
  });

  describe('same-tab refresh on NOTIFICATIONS_READ_EVENT', () => {
    it('refetches the unread count when the event is dispatched', async () => {
      seedSession(3);
      mockGetUnreadCount.mockResolvedValueOnce(2);

      render(<NotificationBadge />);

      expect(screen.getByText('3')).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
      });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('removes the badge when the refetched count is 0', async () => {
      seedSession(1);
      mockGetUnreadCount.mockResolvedValueOnce(0);

      render(<NotificationBadge />);

      expect(screen.getByText('1')).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
      });

      await waitFor(() => {
        expect(screen.queryByText('1')).not.toBeInTheDocument();
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });

    it('retains the previous count when the refetch fails', async () => {
      seedSession(3);
      mockGetUnreadCount.mockRejectedValueOnce(new Error('Network error'));

      render(<NotificationBadge />);

      act(() => {
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
      });

      await waitFor(() => {
        expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('handles multiple consecutive events correctly', async () => {
      seedSession(5);

      render(<NotificationBadge />);

      mockGetUnreadCount.mockResolvedValueOnce(4);
      act(() => {
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
      });

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument();
      });

      mockGetUnreadCount.mockResolvedValueOnce(3);
      act(() => {
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
      });

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });

      expect(mockGetUnreadCount).toHaveBeenCalledTimes(2);
    });

    it('cleans up the event listener on unmount', () => {
      seedSession(2);

      const { unmount } = render(<NotificationBadge />);

      unmount();

      mockGetUnreadCount.mockResolvedValueOnce(0);
      act(() => {
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
      });

      expect(mockGetUnreadCount).not.toHaveBeenCalled();
    });
  });
});
