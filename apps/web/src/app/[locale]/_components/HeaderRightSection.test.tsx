import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HeaderRightSection } from './HeaderRightSection';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockUseAuth = vi.fn();

vi.mock('../_contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('./AuthStatusDisplay', () => ({
  AuthStatusDisplay: ({
    isAuthenticated,
    avatarUrl,
    displayName,
  }: {
    isAuthenticated: boolean;
    avatarUrl?: string | null;
    displayName?: string | null;
  }) => (
    <div
      data-testid="auth-status-display"
      data-authenticated={isAuthenticated}
      data-avatar={avatarUrl}
      data-name={displayName}
    >
      AuthStatusDisplay
    </div>
  ),
}));

vi.mock('./NotificationBadge', () => ({
  NotificationBadge: () => <div data-testid="notification-badge">NotificationBadge</div>,
}));

describe('HeaderRightSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when loading', () => {
    it('renders a placeholder', () => {
      mockUseAuth.mockReturnValue({ user: null, isLoading: true, profile: null });
      render(<HeaderRightSection />);

      expect(screen.queryByTestId('auth-status-display')).not.toBeInTheDocument();
      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });
  });

  describe('when authenticated', () => {
    it('shows NotificationBadge and AuthStatusDisplay fed from the auth context profile', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        profile: {
          avatarUrl: 'https://example.com/avatar.jpg',
          displayName: 'TestUser',
        },
      });

      render(<HeaderRightSection />);

      expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      const authDisplay = screen.getByTestId('auth-status-display');
      expect(authDisplay).toHaveAttribute('data-authenticated', 'true');
      expect(authDisplay).toHaveAttribute('data-avatar', 'https://example.com/avatar.jpg');
      expect(authDisplay).toHaveAttribute('data-name', 'TestUser');
    });

    it('falls back to null avatar/name for a provisional viewer (no profile)', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        profile: null,
      });

      render(<HeaderRightSection />);

      const authDisplay = screen.getByTestId('auth-status-display');
      expect(authDisplay).toHaveAttribute('data-authenticated', 'true');
      expect(authDisplay).not.toHaveAttribute('data-avatar');
      expect(authDisplay).not.toHaveAttribute('data-name');
    });
  });

  describe('when not authenticated', () => {
    it('does not show NotificationBadge', () => {
      mockUseAuth.mockReturnValue({ user: null, isLoading: false, profile: null });
      render(<HeaderRightSection />);

      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
      const authDisplay = screen.getByTestId('auth-status-display');
      expect(authDisplay).toHaveAttribute('data-authenticated', 'false');
    });
  });
});
