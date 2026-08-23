import * as matchers from '@testing-library/jest-dom/matchers';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailPasswordForm } from './EmailPasswordForm';

expect.extend(matchers);

const mockSignIn = vi.fn();

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/i18n/use-safe-locale', () => ({
  useSafeLocale: () => 'en',
}));

vi.mock('@/i18n/routing');

vi.mock('../_actions/signIn', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

describe('EmailPasswordForm', () => {
  // Save original location and replace with a mock for each test
  const originalLocation = window.location;

  beforeEach(() => {
    // Replace window.location with a writable mock
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: originalLocation.href },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('should render the form with email and password fields', () => {
    render(<EmailPasswordForm />);

    expect(screen.getByLabelText('emailLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('passwordLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'emailSignIn' })).toBeInTheDocument();
  });

  it('should call signIn Server Action and navigate on success', async () => {
    mockSignIn.mockResolvedValue({ success: true, locale: 'en' });

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

    await waitFor(() => {
      expect(window.location.href).toBe('/en/mypage?toast=login_success');
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

  it('should not show error message when signIn succeeds', async () => {
    mockSignIn.mockResolvedValue({ success: true, locale: 'en' });

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

    await waitFor(() => {
      expect(window.location.href).toBe('/en/mypage?toast=login_success');
    });

    expect(screen.queryByText('emailSignInError')).not.toBeInTheDocument();
    expect(screen.queryByText('rateLimited')).not.toBeInTheDocument();
  });

  it('should navigate with locale from server response', async () => {
    mockSignIn.mockResolvedValue({ success: true, locale: 'ja' });

    render(<EmailPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'password123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignIn' }));

    await waitFor(() => {
      expect(window.location.href).toBe('/ja/mypage?toast=login_success');
    });
  });

  it('should not navigate when signIn returns error', async () => {
    mockSignIn.mockResolvedValue({ error: 'invalidCredentials' });
    const originalHref = window.location.href;

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

    expect(window.location.href).toBe(originalHref);
  });

  it('should not navigate when signIn returns rate limited error', async () => {
    mockSignIn.mockResolvedValue({ error: 'rateLimited' });
    const originalHref = window.location.href;

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

    expect(window.location.href).toBe(originalHref);
  });
});
