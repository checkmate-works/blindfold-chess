import * as matchers from '@testing-library/jest-dom/matchers';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ForgotPasswordForm } from './ForgotPasswordForm';

expect.extend(matchers);

const mockForgotPassword = vi.fn();

vi.mock('@/i18n/use-safe-translations');

vi.mock('../_actions/forgotPassword', () => ({
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
}));

describe('ForgotPasswordForm', () => {
  it('should render the form with email field and submit button', () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText('emailLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it('should call forgotPassword Server Action with the entered email', async () => {
    mockForgotPassword.mockResolvedValue({ success: true });

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('should show sent confirmation message after successful submission', async () => {
    mockForgotPassword.mockResolvedValue({ success: true });

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

  it('should show error message when forgotPassword fails', async () => {
    mockForgotPassword.mockResolvedValue({ error: 'resetFailed' });

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('should show rate limited error', async () => {
    mockForgotPassword.mockResolvedValue({ error: 'rateLimited' });

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('rateLimited')).toBeInTheDocument();
    });
  });

  it('should show loading state while submitting', async () => {
    let resolveForgotPassword: (value: unknown) => void;
    mockForgotPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveForgotPassword = resolve;
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

    resolveForgotPassword!({ success: true });
  });

  it('should show error when Server Action throws', async () => {
    mockForgotPassword.mockRejectedValue(new Error('Network error'));

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });
});
