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

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/use-safe-locale', () => ({
  useSafeLocale: () => mockLocale,
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

const mockPush = vi.fn();
let mockPathname = '/en';
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => mockPathname,
}));

describe('AuthStatusDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale = 'en';
    mockPathname = '/en';
    mockPush.mockClear();
  });

  describe('when not authenticated (isAuthenticated=false)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        signOut: vi.fn(),
      });
    });

    it('should display sign-up and sign-in links carrying the current page as the return target', () => {
      mockPathname = '/en/articles/some-post';
      render(<AuthStatusDisplay isAuthenticated={false} />);
      const signUpLink = screen.getByText('signUp').closest('a');
      const signInLink = screen.getByText('signIn').closest('a');
      expect(signUpLink).toHaveAttribute('href', '/en/sign-up?next=%2Fen%2Farticles%2Fsome-post');
      expect(signInLink).toHaveAttribute('href', '/en/sign-in?next=%2Fen%2Farticles%2Fsome-post');
    });

    it('does not offer to return to an auth screen', () => {
      // The header renders on `/sign-in` too; `?next=/en/sign-in` would make
      // the proxy's authenticated-visitor redirect bounce in a loop.
      mockPathname = '/en/sign-in';
      render(<AuthStatusDisplay isAuthenticated={false} />);
      expect(screen.getByText('signIn').closest('a')).toHaveAttribute('href', '/en/sign-in');
    });

    it('adds the query string on click, not during render', () => {
      // Reading `useSearchParams()` during render would bail the ISR pages
      // this header sits on out of static rendering.
      mockPathname = '/en/leaderboard/score/all';
      window.history.replaceState({}, '', '/en/leaderboard/score/all?page=3');
      render(<AuthStatusDisplay isAuthenticated={false} />);

      const signInLink = screen.getByText('signIn').closest('a') as HTMLAnchorElement;
      expect(signInLink).toHaveAttribute(
        'href',
        '/en/sign-in?next=%2Fen%2Fleaderboard%2Fscore%2Fall'
      );

      fireEvent.click(signInLink, { button: 0 });
      expect(mockPush).toHaveBeenCalledWith(
        '/en/sign-in?next=%2Fen%2Fleaderboard%2Fscore%2Fall%3Fpage%3D3'
      );
    });
  });

  describe('when authenticated (isAuthenticated=true)', () => {
    let mockSignOut: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockSignOut = vi.fn().mockResolvedValue(undefined);
      mockShowToast.mockClear();
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        signOut: mockSignOut,
      });
    });

    it('should display the account icon button', () => {
      render(<AuthStatusDisplay isAuthenticated={true} />);
      expect(screen.getByRole('button', { name: 'account' })).toBeInTheDocument();
    });

    describe('avatar display', () => {
      it('should display the avatar image when avatarUrl is provided', () => {
        render(
          <AuthStatusDisplay
            isAuthenticated={true}
            avatarUrl="https://example.com/avatar.png"
            displayName="John Doe"
          />
        );
        const img = screen.getByRole('img', { name: 'John Doe' });
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
      });

      it('should use displayName as alt text for avatar image', () => {
        render(
          <AuthStatusDisplay
            isAuthenticated={true}
            avatarUrl="https://example.com/avatar.png"
            displayName="Alice"
          />
        );
        const img = screen.getByRole('img', { name: 'Alice' });
        expect(img).toBeInTheDocument();
      });

      it('should use empty alt text when displayName is null', () => {
        render(
          <AuthStatusDisplay
            isAuthenticated={true}
            avatarUrl="https://example.com/avatar.png"
            displayName={null}
          />
        );
        const img = screen.getByAltText('');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
      });

      it('should display initial of displayName when avatarUrl is not provided', () => {
        render(<AuthStatusDisplay isAuthenticated={true} displayName="John Doe" />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.getByText('J')).toBeInTheDocument();
      });

      it('should display initial of displayName in uppercase', () => {
        render(<AuthStatusDisplay isAuthenticated={true} displayName="alice" />);
        expect(screen.getByText('A')).toBeInTheDocument();
      });

      it('should fall back to email initial when displayName is null', () => {
        render(<AuthStatusDisplay isAuthenticated={true} displayName={null} />);
        // user.email is 'test@example.com', so initial should be 'T'
        expect(screen.getByText('T')).toBeInTheDocument();
      });

      it('should display "?" when displayName and email are both unavailable', () => {
        mockUseAuth.mockReturnValue({
          user: { id: 'user-1' },
          signOut: vi.fn(),
        });
        render(<AuthStatusDisplay isAuthenticated={true} displayName={null} />);
        expect(screen.getByText('?')).toBeInTheDocument();
      });

      it('should display "?" when user is null (client not yet synced) and no displayName', () => {
        mockUseAuth.mockReturnValue({
          user: null,
          signOut: vi.fn(),
        });
        render(<AuthStatusDisplay isAuthenticated={true} displayName={null} />);
        expect(screen.getByText('?')).toBeInTheDocument();
      });

      it('should not display avatar image when avatarUrl is null', () => {
        render(<AuthStatusDisplay isAuthenticated={true} avatarUrl={null} displayName="John" />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.getByText('J')).toBeInTheDocument();
      });
    });

    it('should open the dropdown when the icon button is clicked', () => {
      render(<AuthStatusDisplay isAuthenticated={true} />);
      const button = screen.getByRole('button', { name: 'account' });

      expect(screen.queryByText('settings')).not.toBeInTheDocument();
      expect(screen.queryByText('signOut')).not.toBeInTheDocument();

      fireEvent.click(button);

      expect(screen.getByText('settings')).toBeInTheDocument();
      expect(screen.getByText('signOut')).toBeInTheDocument();
    });

    describe('dropdown menu', () => {
      beforeEach(() => {
        render(<AuthStatusDisplay isAuthenticated={true} />);
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
