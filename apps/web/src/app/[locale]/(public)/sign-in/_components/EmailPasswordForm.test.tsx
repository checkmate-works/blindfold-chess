import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailPasswordForm } from './EmailPasswordForm';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const mockSignInWithPassword = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
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

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
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

  it('should call signInWithPassword with valid input', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    render(<EmailPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'password123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignIn' }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockPush).toHaveBeenCalledWith('/en/mypage?toast=login_success');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('should show error message when signIn fails', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: new Error('Invalid credentials'),
    });

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
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should render a forgot password link', () => {
    render(<EmailPasswordForm />);

    const link = screen.getByText('forgotPassword');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  it('should show loading state while submitting', async () => {
    let resolveSignIn: (value: unknown) => void;
    mockSignInWithPassword.mockReturnValue(
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

    resolveSignIn!({ error: null });
  });
});
