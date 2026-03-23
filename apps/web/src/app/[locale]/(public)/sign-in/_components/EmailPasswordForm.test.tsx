import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailPasswordForm } from './EmailPasswordForm';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const mockSignIn = vi.fn();
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

  it('should call signIn Server Action with valid input', async () => {
    mockSignIn.mockResolvedValue({ success: true });

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

    expect(mockPush).toHaveBeenCalledWith('/en/mypage?toast=login_success');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('should call router.refresh() before router.push() on successful sign-in', async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const callOrder: string[] = [];
    mockRefresh.mockImplementation(() => {
      callOrder.push('refresh');
    });
    mockPush.mockImplementation(() => {
      callOrder.push('push');
    });

    render(<EmailPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'password123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignIn' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });

    expect(callOrder).toEqual(['refresh', 'push']);
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
    expect(mockPush).not.toHaveBeenCalled();
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

    resolveSignIn!({ success: true });
  });

  it('should show error when Server Action throws', async () => {
    mockSignIn.mockRejectedValue(new Error('Network error'));

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
    expect(mockPush).not.toHaveBeenCalled();
  });
});
