import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HeaderRightSection } from './HeaderRightSection';

afterEach(() => {
  cleanup();
});

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

  describe('when server isAuthenticated=true', () => {
    it('shows NotificationBadge and AuthStatusDisplay with isAuthenticated=true', () => {
      render(
        <HeaderRightSection
          isAuthenticated={true}
          avatarUrl="https://example.com/avatar.jpg"
          displayName="TestUser"
        />
      );

      expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      const authDisplay = screen.getByTestId('auth-status-display');
      expect(authDisplay).toBeInTheDocument();
      expect(authDisplay).toHaveAttribute('data-authenticated', 'true');
    });

    it('passes avatarUrl and displayName to AuthStatusDisplay', () => {
      render(
        <HeaderRightSection
          isAuthenticated={true}
          avatarUrl="https://example.com/avatar.jpg"
          displayName="TestUser"
        />
      );

      const authDisplay = screen.getByTestId('auth-status-display');
      expect(authDisplay).toHaveAttribute('data-avatar', 'https://example.com/avatar.jpg');
      expect(authDisplay).toHaveAttribute('data-name', 'TestUser');
    });
  });

  describe('when server isAuthenticated=false', () => {
    it('does not show NotificationBadge', () => {
      render(<HeaderRightSection isAuthenticated={false} avatarUrl={null} displayName={null} />);

      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });

    it('shows AuthStatusDisplay with isAuthenticated=false', () => {
      render(<HeaderRightSection isAuthenticated={false} avatarUrl={null} displayName={null} />);

      const authDisplay = screen.getByTestId('auth-status-display');
      expect(authDisplay).toBeInTheDocument();
      expect(authDisplay).toHaveAttribute('data-authenticated', 'false');
    });
  });

  describe('transition from authenticated to unauthenticated (rerender)', () => {
    it('transitions correctly on rerender', () => {
      const { rerender } = render(
        <HeaderRightSection
          isAuthenticated={true}
          avatarUrl="https://example.com/avatar.jpg"
          displayName="TestUser"
        />
      );

      expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      expect(screen.getByTestId('auth-status-display')).toHaveAttribute(
        'data-authenticated',
        'true'
      );

      rerender(<HeaderRightSection isAuthenticated={false} avatarUrl={null} displayName={null} />);

      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
      expect(screen.getByTestId('auth-status-display')).toHaveAttribute(
        'data-authenticated',
        'false'
      );
    });
  });
});
