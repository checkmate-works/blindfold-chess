import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ForgotPasswordForm } from './ForgotPasswordForm';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const mockResetPasswordForEmail = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
}));

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form with email field and submit button', () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText('emailLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it('should call resetPasswordForEmail with the entered email', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
    });
  });

  it('should show sent confirmation message after successful submission', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('sentDescription')).toBeInTheDocument();
      expect(screen.getByText('checkInbox')).toBeInTheDocument();
    });
  });

  it('should show error message when resetPasswordForEmail fails', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: new Error('Reset failed'),
    });

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('should show loading state while submitting', async () => {
    let resolveReset: (value: unknown) => void;
    mockResetPasswordForEmail.mockReturnValue(
      new Promise((resolve) => {
        resolveReset = resolve;
      })
    );

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.submit(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByText('submitLoading')).toBeInTheDocument();
    });

    resolveReset!({ error: null });
  });
});
