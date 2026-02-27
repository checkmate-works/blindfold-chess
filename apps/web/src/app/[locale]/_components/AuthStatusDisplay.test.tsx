import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStatusDisplay } from './AuthStatusDisplay';

afterEach(() => {
  cleanup();
});

const mockUseAuth = vi.fn();

vi.mock('../_contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

let mockLocale = 'en';

vi.mock('next-intl', () => ({
  useLocale: () => mockLocale,
  useTranslations: () => (key: string) => key,
}));

describe('AuthStatusDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale = 'en';
  });

  describe('when loading', () => {
    it('should return null while loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        signOut: vi.fn(),
      });

      const { container } = render(<AuthStatusDisplay />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('when not signed in', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        signOut: vi.fn(),
      });
    });

    it('should display the sign-up link', () => {
      render(<AuthStatusDisplay />);
      expect(screen.getByText('signUp')).toBeInTheDocument();
    });

    it('should link to the sign-in page with the correct locale', () => {
      render(<AuthStatusDisplay />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/en/sign-in');
    });

    it('should have correct href for ja locale', () => {
      mockLocale = 'ja';
      render(<AuthStatusDisplay />);
      expect(screen.getByRole('link')).toHaveAttribute('href', '/ja/sign-in');
    });

    it('should not display the account icon button', () => {
      render(<AuthStatusDisplay />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('when signed in', () => {
    let mockSignOut: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockSignOut = vi.fn();
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        signOut: mockSignOut,
      });
    });

    it('should display the account icon button', () => {
      render(<AuthStatusDisplay />);
      expect(screen.getByRole('button', { name: 'account' })).toBeInTheDocument();
    });

    it('should open the dropdown when the icon button is clicked', () => {
      render(<AuthStatusDisplay />);
      const button = screen.getByRole('button', { name: 'account' });

      expect(screen.queryByText('settings')).not.toBeInTheDocument();
      expect(screen.queryByText('signOut')).not.toBeInTheDocument();

      fireEvent.click(button);

      expect(screen.getByText('settings')).toBeInTheDocument();
      expect(screen.getByText('signOut')).toBeInTheDocument();
    });

    describe('dropdown menu', () => {
      beforeEach(() => {
        render(<AuthStatusDisplay />);
        fireEvent.click(screen.getByRole('button', { name: 'account' }));
      });

      it('should display the settings link', () => {
        expect(screen.getByText('settings')).toBeInTheDocument();
      });

      it('should have a settings link pointing to the preferences page', () => {
        const settingsLink = screen.getByText('settings').closest('a');
        expect(settingsLink).toHaveAttribute('href', '/en/preferences');
      });

      it('should display the sign-out button', () => {
        const signOutButton = screen.getByText('signOut').closest('button');
        expect(signOutButton).toBeInTheDocument();
      });

      it('should call signOut when the sign-out button is clicked', () => {
        const signOutButton = screen.getByText('signOut').closest('button')!;
        fireEvent.click(signOutButton);
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });

      it('should close the dropdown when clicking outside', () => {
        expect(screen.getByText('settings')).toBeInTheDocument();

        fireEvent.mouseDown(document.body);

        expect(screen.queryByText('settings')).not.toBeInTheDocument();
      });
    });
  });
});
