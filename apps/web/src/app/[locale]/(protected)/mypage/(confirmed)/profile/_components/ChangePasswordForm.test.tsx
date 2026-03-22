import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChangePasswordForm } from './ChangePasswordForm';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const mockChangePassword = vi.fn();
const mockShowToast = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../_actions/changePassword', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}));

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form with current password, new password, and confirm password fields', () => {
    render(<ChangePasswordForm />);

    expect(screen.getByLabelText('currentPasswordLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('newPasswordLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('confirmPasswordLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument();
  });

  it('should show password mismatch error when new passwords do not match', async () => {
    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'differentpassword' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('passwordMismatch')).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('should show password too short error when new password is less than MIN_PASSWORD_LENGTH', async () => {
    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'short1' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'short1' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('tooShort')).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('should show missingLetter error when new password has no letters', async () => {
    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: '12345678' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: '12345678' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('missingLetter')).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('should show missingDigit error when new password has no digits', async () => {
    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'abcdefgh' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'abcdefgh' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('missingDigit')).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('should show error when new password is the same as current password', async () => {
    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'samepassword123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'samepassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'samepassword123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('passwordSameAsCurrent')).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('should call changePassword Server Action with correct arguments', async () => {
    mockChangePassword.mockResolvedValue({ success: true });

    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'newpassword123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('currentpass123', 'newpassword123');
    });
  });

  it('should show success toast and clear form on successful password change', async () => {
    mockChangePassword.mockResolvedValue({ success: true });

    render(<ChangePasswordForm />);

    const currentPasswordInput = screen.getByLabelText('currentPasswordLabel') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('newPasswordLabel') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('confirmPasswordLabel') as HTMLInputElement;

    fireEvent.change(currentPasswordInput, {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(newPasswordInput, {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'newpassword123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('success', 'success');
    });

    expect(currentPasswordInput.value).toBe('');
    expect(newPasswordInput.value).toBe('');
    expect(confirmPasswordInput.value).toBe('');
  });

  it('should show currentPasswordIncorrect error from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'currentPasswordIncorrect' });

    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'wrongcurrent123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'newpassword123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('currentPasswordIncorrect')).toBeInTheDocument();
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('should show rateLimited error from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'rateLimited' });

    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'newpassword123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('rateLimited')).toBeInTheDocument();
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('should show generic error for passwordTooShort from Server Action (unrecognized code)', async () => {
    mockChangePassword.mockResolvedValue({ error: 'passwordTooShort' });

    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'newpassword123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('should show passwordSameAsCurrent error from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'passwordSameAsCurrent' });

    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'newpassword123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('passwordSameAsCurrent')).toBeInTheDocument();
    });
  });

  it('should show generic error for unknown error codes from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'updateFailed' });

    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'newpassword123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('should show generic error when Server Action throws an exception', async () => {
    mockChangePassword.mockRejectedValue(new Error('Network error'));

    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'newpassword123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('should show loading state while submitting', async () => {
    mockChangePassword.mockReturnValue(
      new Promise(() => {
        // Never resolves to keep loading state
      })
    );

    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'newpassword123' },
    });

    fireEvent.submit(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByText('submitLoading')).toBeInTheDocument();
    });
  });

  it('should clear previous error when submitting again', async () => {
    render(<ChangePasswordForm />);

    // First submission with mismatched passwords
    fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
      target: { value: 'currentpass123' },
    });
    fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'differentpassword' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('passwordMismatch')).toBeInTheDocument();
    });

    // Fix the form and submit again
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'newpassword123' },
    });

    mockChangePassword.mockResolvedValue({ success: true });

    fireEvent.submit(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.queryByText('passwordMismatch')).not.toBeInTheDocument();
    });
  });
});
