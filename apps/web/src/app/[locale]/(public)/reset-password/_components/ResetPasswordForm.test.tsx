import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResetPasswordForm } from './ResetPasswordForm';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const mockResetPassword = vi.fn();
const mockPush = vi.fn();

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/use-safe-locale', () => ({
  useSafeLocale: () => 'en',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('../_actions/resetPassword', () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form with password and confirm password fields', () => {
    render(<ResetPasswordForm />);

    expect(screen.getByLabelText('passwordLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('confirmPasswordLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument();
  });

  it('should show password mismatch error when passwords do not match', async () => {
    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'differentpassword' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('passwordMismatch')).toBeInTheDocument();
    });
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('should show password too short error when password is less than MIN_PASSWORD_LENGTH', async () => {
    mockResetPassword.mockResolvedValue({ error: 'password:tooShort' });

    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'ab1' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'ab1' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('tooShort')).toBeInTheDocument();
    });
  });

  it('should show missingLetter error when password has no letters', async () => {
    mockResetPassword.mockResolvedValue({ error: 'password:missingLetter' });

    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: '12345678' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: '12345678' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('missingLetter')).toBeInTheDocument();
    });
  });

  it('should show missingDigit error when password has no digits', async () => {
    mockResetPassword.mockResolvedValue({ error: 'password:missingDigit' });

    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'abcdefgh' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'abcdefgh' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('missingDigit')).toBeInTheDocument();
    });
  });

  it('should call resetPassword with valid password and redirect on success', async () => {
    mockResetPassword.mockResolvedValue({ success: true });

    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'validpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'validpassword123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('validpassword123');
    });

    expect(mockPush).toHaveBeenCalledWith('/en/mypage?toast=password_reset_success');
  });

  it('should show error message when resetPassword fails', async () => {
    mockResetPassword.mockResolvedValue({ error: 'updateFailed' });

    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'validpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'validpassword123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show loading state while submitting', async () => {
    let resolveUpdate: (value: unknown) => void;
    mockResetPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      })
    );

    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'validpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'validpassword123' },
    });

    fireEvent.submit(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByText('submitLoading')).toBeInTheDocument();
    });

    resolveUpdate!({ success: true });
  });
});
