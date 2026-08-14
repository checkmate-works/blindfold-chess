import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthPromptModal } from './AuthPromptModal';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/i18n/use-safe-locale', () => ({
  useSafeLocale: () => 'en',
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    locale,
    children,
    onClick,
    ...props
  }: {
    href: string;
    locale: string;
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    [key: string]: unknown;
  }) => (
    // Real Next.js <Link> intercepts the click and routes via the App Router,
    // so it never lets the browser perform a full document navigation.
    // jsdom does not implement that navigation, so without preventDefault the
    // click queues a `setTimeout(0)` navigation that fires after the test
    // ends as "Not implemented: navigation to another Document".
    <a
      href={`/${locale}${href}`}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock('../_hooks/use-scroll-lock', () => ({
  useScrollLock: vi.fn(),
}));

// The modal branches on the viewer's registration state; default to anonymous
// (not provisional) so the sign-in variant renders for the existing cases.
const authState = vi.hoisted(() => ({ isProvisional: false }));
vi.mock('@/app/[locale]/_contexts/AuthContext', () => ({
  useAuth: () => ({ isProvisional: authState.isProvisional }),
}));

// The sign-in variant threads the current path into `?next=`; stub it to a
// fixed value so the redirect target is deterministic (and so the hook's
// next/navigation reads don't need a router in the test environment).
vi.mock('@/app/[locale]/_hooks/use-current-path-as-next', () => ({
  useCurrentPathAsNext: () => '/p',
}));

describe('AuthPromptModal', () => {
  let onClose: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn<() => void>();
    authState.isProvisional = false;
  });

  describe('when isOpen is false', () => {
    it('should render nothing', () => {
      const { container } = render(<AuthPromptModal isOpen={false} onClose={onClose} />);

      expect(container.innerHTML).toBe('');
    });

    it('should not render the dialog', () => {
      render(<AuthPromptModal isOpen={false} onClose={onClose} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('when isOpen is true', () => {
    it('should render a dialog', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render the title', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText('title')).toBeInTheDocument();
    });

    it('should render the description', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText('description')).toBeInTheDocument();
    });

    it('should render the sign-up button linking to sign-up page', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      const signUpLink = screen.getByText('signUpButton');
      expect(signUpLink.closest('a')).toHaveAttribute('href', '/en/sign-up?next=%2Fp');
    });

    it('should render the sign-in button linking to sign-in page', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      const signInLink = screen.getByText('signInButton');
      expect(signInLink.closest('a')).toHaveAttribute('href', '/en/sign-in?next=%2Fp');
    });

    it('should have proper aria attributes on the dialog', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      // `data-app-modal="true"` is the app-owned contract checked by
      // practice-page keyboard guards (see keyboard-guards.ts → isModalOpen).
      expect(dialog).toHaveAttribute('data-app-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should call onClose when sign-up button is clicked', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      fireEvent.click(screen.getByText('signUpButton'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when sign-in button is clicked', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      fireEvent.click(screen.getByText('signInButton'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking outside the modal dialog', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      // The modal container (overlay area outside the dialog) handles close on click.
      // Clicking the container but not the dialog itself should trigger onClose.
      const dialog = screen.getByRole('dialog');
      const modalContainer = dialog.parentElement!;
      fireEvent.click(modalContainer);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the viewer is provisional (signed in, no profile)', () => {
    beforeEach(() => {
      authState.isProvisional = true;
    });

    it('renders the finish-registration prompt linking to setup-username', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText('provisional.title')).toBeInTheDocument();
      const link = screen.getByText('provisional.button');
      expect(link.closest('a')).toHaveAttribute('href', '/en/mypage/setup-username');
    });

    it('does not render the anonymous sign-in / sign-up links', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      expect(screen.queryByText('signUpButton')).not.toBeInTheDocument();
      expect(screen.queryByText('signInButton')).not.toBeInTheDocument();
    });
  });
});
