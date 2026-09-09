import * as matchers from '@testing-library/jest-dom/matchers';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChangePasswordForm } from './ChangePasswordForm';

expect.extend(matchers);

const mockChangePassword = vi.fn();
const mockShowToast = vi.fn();

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../_actions/changePassword', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}));

/**
 * Fills the three password fields and submits. `confirmPassword` defaults to
 * `newPassword`, which is every case except the mismatch ones.
 */
function fillAndSubmit({
  currentPassword,
  newPassword,
  confirmPassword = newPassword,
}: {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}) {
  fireEvent.change(screen.getByLabelText('currentPasswordLabel'), {
    target: { value: currentPassword },
  });
  fireEvent.change(screen.getByLabelText('newPasswordLabel'), {
    target: { value: newPassword },
  });
  fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
    target: { value: confirmPassword },
  });

  fireEvent.submit(screen.getByRole('button', { name: 'submit' }));
}

describe('ChangePasswordForm', () => {
  it('should render the form with current password, new password, and confirm password fields', () => {
    render(<ChangePasswordForm />);

    expect(screen.getByLabelText('currentPasswordLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('newPasswordLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('confirmPasswordLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument();
  });

  it('should show password mismatch error when new passwords do not match', async () => {
    render(<ChangePasswordForm />);

    fillAndSubmit({
      currentPassword: 'currentpass123',
      newPassword: 'newpassword123',
      confirmPassword: 'differentpassword',
    });

    await waitFor(() => {
      expect(screen.getByText('passwordMismatch')).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('should show password too short error when new password is less than MIN_PASSWORD_LENGTH', async () => {
    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'ab1' });

    await waitFor(() => {
      expect(screen.getByText('tooShort')).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('should show missingLetter error when new password has no letters', async () => {
    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: '12345678' });

    await waitFor(() => {
      expect(screen.getByText('missingLetter')).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('should show missingDigit error when new password has no digits', async () => {
    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'abcdefgh' });

    await waitFor(() => {
      expect(screen.getByText('missingDigit')).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('should show error when new password is the same as current password', async () => {
    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'samepassword123', newPassword: 'samepassword123' });

    await waitFor(() => {
      expect(screen.getByText('passwordSameAsCurrent')).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('should call changePassword Server Action with correct arguments', async () => {
    mockChangePassword.mockResolvedValue({ success: true });

    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'newpassword123' });

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

    fillAndSubmit({ currentPassword: 'wrongcurrent123', newPassword: 'newpassword123' });

    await waitFor(() => {
      expect(screen.getByText('currentPasswordIncorrect')).toBeInTheDocument();
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('should show rateLimited error from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'rateLimited' });

    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'newpassword123' });

    await waitFor(() => {
      expect(screen.getByText('rateLimited')).toBeInTheDocument();
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('should show password validation error for password:tooShort from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'password:tooShort' });

    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'newpassword123' });

    await waitFor(() => {
      expect(screen.getByText('tooShort')).toBeInTheDocument();
    });
  });

  it('should show password validation error for password:missingLetter from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'password:missingLetter' });

    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'newpassword123' });

    await waitFor(() => {
      expect(screen.getByText('missingLetter')).toBeInTheDocument();
    });
  });

  it('should show password validation error for password:missingDigit from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'password:missingDigit' });

    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'newpassword123' });

    await waitFor(() => {
      expect(screen.getByText('missingDigit')).toBeInTheDocument();
    });
  });

  it('should show password validation error for password:weak from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'password:weak' });

    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'newpassword123' });

    await waitFor(() => {
      expect(screen.getByText('weak')).toBeInTheDocument();
    });
  });

  it('should show generic error for unknown password: prefixed key from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'password:unknownKey' });

    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'newpassword123' });

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('should show passwordSameAsCurrent error from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'passwordSameAsCurrent' });

    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'newpassword123' });

    await waitFor(() => {
      expect(screen.getByText('passwordSameAsCurrent')).toBeInTheDocument();
    });
  });

  it('should show generic error for unknown error codes from Server Action', async () => {
    mockChangePassword.mockResolvedValue({ error: 'updateFailed' });

    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'newpassword123' });

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('should show generic error when Server Action throws an exception', async () => {
    mockChangePassword.mockRejectedValue(new Error('Network error'));

    render(<ChangePasswordForm />);

    fillAndSubmit({ currentPassword: 'currentpass123', newPassword: 'newpassword123' });

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
    fillAndSubmit({
      currentPassword: 'currentpass123',
      newPassword: 'newpassword123',
      confirmPassword: 'differentpassword',
    });

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
