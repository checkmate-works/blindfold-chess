import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthPromptModal } from './AuthPromptModal';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/use-safe-locale', () => ({
  useSafeLocale: () => 'en',
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    locale,
    children,
    ...props
  }: {
    href: string;
    locale: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={`/${locale}${href}`} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../_hooks/use-scroll-lock', () => ({
  useScrollLock: vi.fn(),
}));

describe('AuthPromptModal', () => {
  let onClose: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn<() => void>();
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
      expect(signUpLink.closest('a')).toHaveAttribute('href', '/en/sign-up');
    });

    it('should render the sign-in button linking to sign-in page', () => {
      render(<AuthPromptModal isOpen={true} onClose={onClose} />);

      const signInLink = screen.getByText('signInButton');
      expect(signInLink.closest('a')).toHaveAttribute('href', '/en/sign-in');
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
});
