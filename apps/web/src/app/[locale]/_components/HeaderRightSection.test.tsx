import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
    global.fetch = vi.fn();
  });

  describe('when loading', () => {
    it('renders a placeholder', () => {
      mockUseAuth.mockReturnValue({ user: null, isLoading: true });
      render(<HeaderRightSection />);

      expect(screen.queryByTestId('auth-status-display')).not.toBeInTheDocument();
      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });
  });

  describe('when authenticated', () => {
    it('shows NotificationBadge and AuthStatusDisplay', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            avatarUrl: 'https://example.com/avatar.jpg',
            displayName: 'TestUser',
          }),
      });

      render(<HeaderRightSection />);

      expect(screen.getByTestId('notification-badge')).toBeInTheDocument();

      await waitFor(() => {
        const authDisplay = screen.getByTestId('auth-status-display');
        expect(authDisplay).toHaveAttribute('data-authenticated', 'true');
        expect(authDisplay).toHaveAttribute('data-avatar', 'https://example.com/avatar.jpg');
        expect(authDisplay).toHaveAttribute('data-name', 'TestUser');
      });
    });
  });

  describe('when not authenticated', () => {
    it('does not show NotificationBadge', () => {
      mockUseAuth.mockReturnValue({ user: null, isLoading: false });
      render(<HeaderRightSection />);

      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
      const authDisplay = screen.getByTestId('auth-status-display');
      expect(authDisplay).toHaveAttribute('data-authenticated', 'false');
    });
  });
});
