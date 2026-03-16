import { NOTIFICATIONS_READ_EVENT } from '@/config';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationBadge } from './NotificationBadge';

afterEach(() => {
  cleanup();
});

const mockGetUnreadCount = vi.fn();

vi.mock('@/app/[locale]/(protected)/mypage/(confirmed)/notifications/_actions', () => ({
  getUnreadCount: () => mockGetUnreadCount(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

describe('NotificationBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display unread count on mount', async () => {
    mockGetUnreadCount.mockResolvedValue(5);

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('should not display badge when unread count is 0', async () => {
    mockGetUnreadCount.mockResolvedValue(0);

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalled();
    });

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should display 99+ when unread count exceeds 99', async () => {
    mockGetUnreadCount.mockResolvedValue(150);

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  it('should refetch unread count when NOTIFICATIONS_READ_EVENT is dispatched', async () => {
    mockGetUnreadCount.mockResolvedValueOnce(3);

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    mockGetUnreadCount.mockResolvedValueOnce(2);

    act(() => {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
    });

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('should remove badge when refetched count is 0 after event', async () => {
    mockGetUnreadCount.mockResolvedValueOnce(1);

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    mockGetUnreadCount.mockResolvedValueOnce(0);

    act(() => {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
    });

    await waitFor(() => {
      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  it('should not display badge when initial getUnreadCount fails', async () => {
    mockGetUnreadCount.mockRejectedValue(new Error('Network error'));

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalled();
    });

    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
  });

  it('should retain previous count when refetch after event fails', async () => {
    mockGetUnreadCount.mockResolvedValueOnce(3);

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    mockGetUnreadCount.mockRejectedValueOnce(new Error('Network error'));

    act(() => {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
    });

    await waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should handle multiple consecutive events correctly', async () => {
    mockGetUnreadCount.mockResolvedValueOnce(5);

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

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

    expect(mockGetUnreadCount).toHaveBeenCalledTimes(3);
  });

  it('should display exactly 99 without truncation', async () => {
    mockGetUnreadCount.mockResolvedValue(99);

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('99')).toBeInTheDocument();
    });

    expect(screen.queryByText('99+')).not.toBeInTheDocument();
  });

  it('should display 99+ for exactly 100', async () => {
    mockGetUnreadCount.mockResolvedValue(100);

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  it('should display 1 at minimum boundary', async () => {
    mockGetUnreadCount.mockResolvedValue(1);

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('should clean up event listener on unmount', async () => {
    mockGetUnreadCount.mockResolvedValueOnce(2);

    const { unmount } = render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    unmount();

    mockGetUnreadCount.mockResolvedValueOnce(0);

    act(() => {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
    });

    expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
  });
});
