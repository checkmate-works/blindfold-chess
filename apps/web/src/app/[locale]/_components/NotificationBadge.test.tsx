import { NOTIFICATIONS_READ_EVENT } from '@/config';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationBadge } from './NotificationBadge';

const mockGetUnreadCount = vi.fn();
const mockUsePathname = vi.fn(() => '/en/mypage');
const mockUseAuth = vi.fn(() => ({
  user: { id: 'test-user' } as { id: string } | null,
  isLoading: false,
  session: null,
  signOut: vi.fn(),
}));

vi.mock('@/app/[locale]/(protected)/mypage/(confirmed)/notifications/_actions', () => ({
  getUnreadCount: () => mockGetUnreadCount(),
}));

vi.mock('next-intl');

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/app/[locale]/_contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('NotificationBadge', () => {
  beforeEach(() => {
    mockGetUnreadCount.mockReset();
    mockUsePathname.mockReturnValue('/en/mypage');
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user' },
      isLoading: false,
      session: null,
      signOut: vi.fn(),
    });
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

  it('should refetch unread count when pathname changes', async () => {
    mockUsePathname.mockReturnValue('/en/mypage');
    mockGetUnreadCount.mockResolvedValueOnce(5);

    const { rerender } = render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    mockGetUnreadCount.mockResolvedValueOnce(3);
    mockUsePathname.mockReturnValue('/en/mypage/notifications');

    rerender(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    // 1 for initial mount + 1 for route change
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(2);
  });

  it('should not refetch when pathname stays the same', async () => {
    mockUsePathname.mockReturnValue('/en/mypage');
    mockGetUnreadCount.mockResolvedValueOnce(5);

    const { rerender } = render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    rerender(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    // Only the initial mount call
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
  });

  it('should not refetch on route change when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, session: null, signOut: vi.fn() });
    mockUsePathname.mockReturnValue('/en/mypage');
    mockGetUnreadCount.mockResolvedValueOnce(0);

    const { rerender } = render(<NotificationBadge />);

    // User guard blocks all fetches when user is null
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(0);

    mockUsePathname.mockReturnValue('/en/mypage/notifications');

    rerender(<NotificationBadge />);

    // Still 0 — no fetch when unauthenticated
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(0);
  });

  it('should refetch on multiple consecutive route changes', async () => {
    mockUsePathname.mockReturnValue('/en/mypage');
    mockGetUnreadCount.mockResolvedValueOnce(5);

    const { rerender } = render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    mockGetUnreadCount.mockResolvedValueOnce(3);
    mockUsePathname.mockReturnValue('/en/mypage/notifications');
    rerender(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    mockGetUnreadCount.mockResolvedValueOnce(1);
    mockUsePathname.mockReturnValue('/en/mypage/settings');
    rerender(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // 1 for initial mount + 2 for route changes
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(3);
  });

  it('should retain previous count when getUnreadCount fails on route change', async () => {
    mockUsePathname.mockReturnValue('/en/mypage');
    mockGetUnreadCount.mockResolvedValueOnce(7);

    const { rerender } = render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    mockGetUnreadCount.mockRejectedValueOnce(new Error('Server error'));
    mockUsePathname.mockReturnValue('/en/mypage/notifications');
    rerender(<NotificationBadge />);

    await waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalledTimes(2);
    });

    // Previous count should be retained
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should hide badge when route change returns unread count of 0', async () => {
    mockUsePathname.mockReturnValue('/en/mypage');
    mockGetUnreadCount.mockResolvedValueOnce(3);

    const { rerender } = render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    mockGetUnreadCount.mockResolvedValueOnce(0);
    mockUsePathname.mockReturnValue('/en/mypage/notifications');
    rerender(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.queryByText('3')).not.toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  it('should not duplicate fetch between initial mount and route change effect on first render', async () => {
    mockUsePathname.mockReturnValue('/en/mypage');
    mockGetUnreadCount.mockResolvedValue(5);

    render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    // Initial mount useEffect fires once; route change useEffect should skip
    // because previousPathname.current === pathname on first render
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
  });

  it('should refetch on route change after user becomes authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, session: null, signOut: vi.fn() });
    mockUsePathname.mockReturnValue('/en/login');

    const { rerender } = render(<NotificationBadge />);

    // User guard blocks fetch when user is null
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(0);

    // User logs in and navigates to mypage
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user' },
      isLoading: false,
      session: null,
      signOut: vi.fn(),
    });
    mockUsePathname.mockReturnValue('/en/mypage');
    mockGetUnreadCount.mockResolvedValueOnce(4);

    rerender(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
  });

  it('should handle route change combined with event dispatch correctly', async () => {
    mockUsePathname.mockReturnValue('/en/mypage');
    mockGetUnreadCount.mockResolvedValueOnce(5);

    const { rerender } = render(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    // Route change triggers refetch
    mockGetUnreadCount.mockResolvedValueOnce(3);
    mockUsePathname.mockReturnValue('/en/mypage/notifications');
    rerender(<NotificationBadge />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    // Event dispatch triggers another refetch
    mockGetUnreadCount.mockResolvedValueOnce(1);
    act(() => {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
    });

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // 1 mount + 1 route change + 1 event
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(3);
  });
});
