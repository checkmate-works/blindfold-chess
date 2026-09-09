import * as matchers from '@testing-library/jest-dom/matchers';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EmailSignUpForm } from './EmailSignUpForm';

expect.extend(matchers);

const mockSignUp = vi.fn();
const mockPush = vi.fn();

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/i18n/use-safe-locale', () => ({
  useSafeLocale: () => 'en',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('../_actions/signUp', () => ({
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

/**
 * Fills the three fields and submits. `email` defaults to the one address
 * every case uses and `confirmPassword` to `password`, which is every case
 * except the mismatch one.
 */
function fillAndSubmit({
  email = 'test@example.com',
  password,
  confirmPassword = password,
}: {
  email?: string;
  password: string;
  confirmPassword?: string;
}) {
  fireEvent.change(screen.getByLabelText('emailLabel'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText('passwordLabel'), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
    target: { value: confirmPassword },
  });

  fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));
}

describe('EmailSignUpForm', () => {
  it('should render the form with email, password, and confirm password fields', () => {
    render(<EmailSignUpForm />);

    expect(screen.getByLabelText('emailLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('passwordLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('confirmPasswordLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'emailSignUp' })).toBeInTheDocument();
  });

  it('should show password mismatch error when passwords do not match', async () => {
    render(<EmailSignUpForm />);

    fillAndSubmit({ password: 'password123', confirmPassword: 'differentpassword' });

    await waitFor(() => {
      expect(screen.getByText('passwordMismatch')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should show password too short error when password is less than MIN_PASSWORD_LENGTH', async () => {
    render(<EmailSignUpForm />);

    fillAndSubmit({ password: 'ab1' });

    await waitFor(() => {
      expect(screen.getByText('tooShort')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should show missingLetter error when password has no letters', async () => {
    render(<EmailSignUpForm />);

    fillAndSubmit({ password: '12345678' });

    await waitFor(() => {
      expect(screen.getByText('missingLetter')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should show missingDigit error when password has no digits', async () => {
    render(<EmailSignUpForm />);

    fillAndSubmit({ password: 'abcdefgh' });

    await waitFor(() => {
      expect(screen.getByText('missingDigit')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should call signUp Server Action with valid input and redirect to verify-email page', async () => {
    mockSignUp.mockResolvedValue({ success: true });

    render(<EmailSignUpForm />);

    fillAndSubmit({ password: 'validpassword123' });

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'validpassword123', undefined);
    });

    expect(mockPush).toHaveBeenCalledWith('/en/sign-up/verify-email?email=test%40example.com');
  });

  it('should show password validation error for password:tooShort from Server Action', async () => {
    mockSignUp.mockResolvedValue({ error: 'password:tooShort' });

    render(<EmailSignUpForm />);

    fillAndSubmit({ password: 'validpassword123' });

    await waitFor(() => {
      expect(screen.getByText('tooShort')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show password validation error for password:missingLetter from Server Action', async () => {
    mockSignUp.mockResolvedValue({ error: 'password:missingLetter' });

    render(<EmailSignUpForm />);

    fillAndSubmit({ password: 'validpassword123' });

    await waitFor(() => {
      expect(screen.getByText('missingLetter')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show password validation error for password:missingDigit from Server Action', async () => {
    mockSignUp.mockResolvedValue({ error: 'password:missingDigit' });

    render(<EmailSignUpForm />);

    fillAndSubmit({ password: 'validpassword123' });

    await waitFor(() => {
      expect(screen.getByText('missingDigit')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show password validation error for password:weak from Server Action', async () => {
    mockSignUp.mockResolvedValue({ error: 'password:weak' });

    render(<EmailSignUpForm />);

    fillAndSubmit({ password: 'validpassword123' });

    await waitFor(() => {
      expect(screen.getByText('weak')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show generic error for unknown password: prefixed key from Server Action', async () => {
    mockSignUp.mockResolvedValue({ error: 'password:unknownKey' });

    render(<EmailSignUpForm />);

    fillAndSubmit({ password: 'validpassword123' });

    await waitFor(() => {
      expect(screen.getByText('emailSignUpError')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show error message when signUp fails', async () => {
    mockSignUp.mockResolvedValue({ error: 'signUpFailed' });

    render(<EmailSignUpForm />);

    fillAndSubmit({ password: 'validpassword123' });

    await waitFor(() => {
      expect(screen.getByText('emailSignUpError')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show rate limited error', async () => {
    mockSignUp.mockResolvedValue({ error: 'rateLimited' });

    render(<EmailSignUpForm />);

    fillAndSubmit({ password: 'validpassword123' });

    await waitFor(() => {
      expect(screen.getByText('rateLimited')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show loading state while submitting', async () => {
    let resolveSignUp: (value: unknown) => void;
    mockSignUp.mockReturnValue(
      new Promise((resolve) => {
        resolveSignUp = resolve;
      })
    );

    render(<EmailSignUpForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'validpassword123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'validpassword123' },
    });

    fireEvent.submit(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByText('emailSignUpLoading')).toBeInTheDocument();
    });

    resolveSignUp!({ success: true });
  });
});
