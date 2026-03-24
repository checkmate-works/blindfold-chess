import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailPasswordForm } from './EmailPasswordForm';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const mockSignIn = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockIsRedirectError = vi.fn();

vi.mock('next/dist/client/components/redirect-error', () => ({
  isRedirectError: (...args: unknown[]) => mockIsRedirectError(...args),
}));

vi.mock('../_actions/signIn', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

describe('EmailPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form with email and password fields', () => {
    render(<EmailPasswordForm />);

    expect(screen.getByLabelText('emailLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('passwordLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'emailSignIn' })).toBeInTheDocument();
  });

  it('should call signIn Server Action with valid input (redirect happens server-side)', async () => {
    // On success, the server action calls redirect() which throws NEXT_REDIRECT.
    // In tests, we simulate this by having signIn throw.
    const redirectError = new Error('NEXT_REDIRECT');
    mockSignIn.mockRejectedValue(redirectError);
    mockIsRedirectError.mockReturnValue(true);

    render(<EmailPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'password123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignIn' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should show error message when signIn fails', async () => {
    mockSignIn.mockResolvedValue({ error: 'invalidCredentials' });

    render(<EmailPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignIn' }));

    await waitFor(() => {
      expect(screen.getByText('emailSignInError')).toBeInTheDocument();
    });
  });

  it('should show rate limited error', async () => {
    mockSignIn.mockResolvedValue({ error: 'rateLimited' });

    render(<EmailPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'password123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignIn' }));

    await waitFor(() => {
      expect(screen.getByText('rateLimited')).toBeInTheDocument();
    });
  });

  it('should render a forgot password link', () => {
    render(<EmailPasswordForm />);

    const link = screen.getByText('forgotPassword');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  it('should show loading state while submitting', async () => {
    let resolveSignIn: (value: unknown) => void;
    mockSignIn.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      })
    );

    render(<EmailPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'password123' },
    });

    fireEvent.submit(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByText('emailSignInLoading')).toBeInTheDocument();
    });

    resolveSignIn!({ error: 'invalidCredentials' });
  });

  it('should show error when Server Action throws', async () => {
    mockSignIn.mockRejectedValue(new Error('Network error'));
    mockIsRedirectError.mockReturnValue(false);

    render(<EmailPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'password123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignIn' }));

    await waitFor(() => {
      expect(screen.getByText('emailSignInError')).toBeInTheDocument();
    });
  });

  it('should not show error message when signIn succeeds (result is undefined)', async () => {
    mockSignIn.mockResolvedValue(undefined);

    render(<EmailPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'password123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignIn' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    expect(screen.queryByText('emailSignInError')).not.toBeInTheDocument();
    expect(screen.queryByText('rateLimited')).not.toBeInTheDocument();
  });

  it('should not show error message when redirect error is thrown', async () => {
    const redirectError = new Error('NEXT_REDIRECT');
    mockSignIn.mockRejectedValue(redirectError);
    mockIsRedirectError.mockReturnValue(true);

    render(<EmailPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'password123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignIn' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    expect(screen.queryByText('emailSignInError')).not.toBeInTheDocument();
    expect(screen.queryByText('rateLimited')).not.toBeInTheDocument();
  });

  it('should show error when non-redirect exception is thrown', async () => {
    mockSignIn.mockRejectedValue(new TypeError('fetch failed'));
    mockIsRedirectError.mockReturnValue(false);

    render(<EmailPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'password123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignIn' }));

    await waitFor(() => {
      expect(screen.getByText('emailSignInError')).toBeInTheDocument();
    });
    expect(mockIsRedirectError).toHaveBeenCalled();
  });
});
