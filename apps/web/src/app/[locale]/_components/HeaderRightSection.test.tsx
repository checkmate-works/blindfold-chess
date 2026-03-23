import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HeaderRightSection } from './HeaderRightSection';

afterEach(() => {
  cleanup();
});

const mockRefreshUser = vi.fn().mockResolvedValue(undefined);
let mockUser: { id: string; email: string } | null = null;
let mockIsLoading = false;

vi.mock('../_contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: mockIsLoading,
    refreshUser: mockRefreshUser,
    signOut: vi.fn(),
    session: null,
  }),
}));

vi.mock('./AuthStatusDisplay', () => ({
  AuthStatusDisplay: ({
    avatarUrl,
    displayName,
  }: {
    avatarUrl?: string | null;
    displayName?: string | null;
  }) => (
    <div data-testid="auth-status-display" data-avatar={avatarUrl} data-name={displayName}>
      AuthStatusDisplay
    </div>
  ),
}));

vi.mock('./NotificationBadge', () => ({
  NotificationBadge: () => <div data-testid="notification-badge">NotificationBadge</div>,
}));

vi.mock('./Skeleton', () => ({
  Skeleton: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

describe('HeaderRightSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockIsLoading = false;
  });

  describe('when server isAuthenticated=true but client user=null (mismatch)', () => {
    it('shows skeleton placeholders', () => {
      mockUser = null;
      mockIsLoading = false;

      render(<HeaderRightSection isAuthenticated={true} avatarUrl={null} displayName={null} />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons).toHaveLength(2);
    });

    it('calls refreshUser to sync client auth state', async () => {
      mockUser = null;
      mockIsLoading = false;

      render(<HeaderRightSection isAuthenticated={true} avatarUrl={null} displayName={null} />);

      // useEffect runs after render; refreshUser should be called
      await vi.waitFor(() => {
        expect(mockRefreshUser).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call refreshUser more than once even if re-rendered (hasAttemptedRefresh guard)', async () => {
      mockUser = null;
      mockIsLoading = false;

      const { rerender } = render(
        <HeaderRightSection isAuthenticated={true} avatarUrl={null} displayName={null} />
      );

      await vi.waitFor(() => {
        expect(mockRefreshUser).toHaveBeenCalledTimes(1);
      });

      // Re-render with same props (user still null)
      rerender(<HeaderRightSection isAuthenticated={true} avatarUrl={null} displayName={null} />);

      // refreshUser should still only have been called once
      expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    });

    it('does not retry when refreshUser rejects', async () => {
      mockUser = null;
      mockIsLoading = false;
      mockRefreshUser.mockRejectedValueOnce(new Error('Network error'));

      const { rerender } = render(
        <HeaderRightSection isAuthenticated={true} avatarUrl={null} displayName={null} />
      );

      await vi.waitFor(() => {
        expect(mockRefreshUser).toHaveBeenCalledTimes(1);
      });

      // Re-render — should NOT retry after failure
      rerender(<HeaderRightSection isAuthenticated={true} avatarUrl={null} displayName={null} />);

      expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('when server isAuthenticated=true and client user is present', () => {
    it('shows NotificationBadge and AuthStatusDisplay', () => {
      mockUser = { id: 'user-1', email: 'test@example.com' };
      mockIsLoading = false;

      render(
        <HeaderRightSection
          isAuthenticated={true}
          avatarUrl="https://example.com/avatar.jpg"
          displayName="TestUser"
        />
      );

      expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      expect(screen.getByTestId('auth-status-display')).toBeInTheDocument();
      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    });

    it('does not call refreshUser when user is already present', () => {
      mockUser = { id: 'user-1', email: 'test@example.com' };
      mockIsLoading = false;

      render(<HeaderRightSection isAuthenticated={true} avatarUrl={null} displayName={null} />);

      expect(mockRefreshUser).not.toHaveBeenCalled();
    });
  });

  describe('when server isAuthenticated=false', () => {
    it('does not show NotificationBadge', () => {
      mockUser = null;
      mockIsLoading = false;

      render(<HeaderRightSection isAuthenticated={false} avatarUrl={null} displayName={null} />);

      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });

    it('shows AuthStatusDisplay (sign-in/sign-up links)', () => {
      mockUser = null;
      mockIsLoading = false;

      render(<HeaderRightSection isAuthenticated={false} avatarUrl={null} displayName={null} />);

      expect(screen.getByTestId('auth-status-display')).toBeInTheDocument();
    });

    it('does not call refreshUser', () => {
      mockUser = null;
      mockIsLoading = false;

      render(<HeaderRightSection isAuthenticated={false} avatarUrl={null} displayName={null} />);

      expect(mockRefreshUser).not.toHaveBeenCalled();
    });
  });

  describe('when isLoading=true and not authenticated', () => {
    it('returns null (nothing rendered)', () => {
      mockUser = null;
      mockIsLoading = true;

      const { container } = render(
        <HeaderRightSection isAuthenticated={false} avatarUrl={null} displayName={null} />
      );

      expect(container.innerHTML).toBe('');
    });
  });
});
