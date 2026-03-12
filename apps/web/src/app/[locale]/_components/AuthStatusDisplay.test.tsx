import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStatusDisplay } from './AuthStatusDisplay';

afterEach(() => {
  cleanup();
});

const mockUseAuth = vi.fn();

vi.mock('../_contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockShowToast = vi.fn();

vi.mock('../_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

let mockLocale = 'en';

vi.mock('next-intl', () => ({
  useLocale: () => mockLocale,
  useTranslations: () => (key: string) => key,
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

describe('AuthStatusDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale = 'en';
    mockPush.mockClear();
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

    it('should display sign-up and sign-in links', () => {
      render(<AuthStatusDisplay />);
      const signUpLink = screen.getByText('signUp').closest('a');
      const signInLink = screen.getByText('signIn').closest('a');
      expect(signUpLink).toHaveAttribute('href', '/en/sign-up');
      expect(signInLink).toHaveAttribute('href', '/en/sign-in');
    });
  });

  describe('when signed in', () => {
    let mockSignOut: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockSignOut = vi.fn().mockResolvedValue(undefined);
      mockShowToast.mockClear();
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

      it('should call signOut and redirect when the sign-out button is clicked', async () => {
        const signOutButton = screen.getByText('signOut').closest('button')!;
        fireEvent.click(signOutButton);
        expect(mockSignOut).toHaveBeenCalledTimes(1);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/en?toast=logout_success');
        });
      });

      it('should close the dropdown when clicking outside', () => {
        expect(screen.getByText('settings')).toBeInTheDocument();

        fireEvent.mouseDown(document.body);

        expect(screen.queryByText('settings')).not.toBeInTheDocument();
      });
    });
  });
});
