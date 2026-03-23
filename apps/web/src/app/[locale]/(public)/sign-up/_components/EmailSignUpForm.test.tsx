import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailSignUpForm } from './EmailSignUpForm';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const mockSignUp = vi.fn();
const mockPush = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('../_actions/signUp', () => ({
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

describe('EmailSignUpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form with email, password, and confirm password fields', () => {
    render(<EmailSignUpForm />);

    expect(screen.getByLabelText('emailLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('passwordLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('confirmPasswordLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'emailSignUp' })).toBeInTheDocument();
  });

  it('should show password mismatch error when passwords do not match', async () => {
    render(<EmailSignUpForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'differentpassword' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(screen.getByText('passwordMismatch')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should show password too short error when password is less than MIN_PASSWORD_LENGTH', async () => {
    render(<EmailSignUpForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'ab1' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'ab1' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(screen.getByText('tooShort')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should show missingLetter error when password has no letters', async () => {
    render(<EmailSignUpForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: '12345678' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: '12345678' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(screen.getByText('missingLetter')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should show missingDigit error when password has no digits', async () => {
    render(<EmailSignUpForm />);

    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('passwordLabel'), {
      target: { value: 'abcdefgh' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'abcdefgh' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(screen.getByText('missingDigit')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should call signUp Server Action with valid input and redirect to verify-email page', async () => {
    mockSignUp.mockResolvedValue({ success: true });

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

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'validpassword123');
    });

    expect(mockPush).toHaveBeenCalledWith('/en/sign-up/verify-email?email=test%40example.com');
  });

  it('should show password validation error for password:tooShort from Server Action', async () => {
    mockSignUp.mockResolvedValue({ error: 'password:tooShort' });

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

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(screen.getByText('tooShort')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show password validation error for password:missingLetter from Server Action', async () => {
    mockSignUp.mockResolvedValue({ error: 'password:missingLetter' });

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

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(screen.getByText('missingLetter')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show password validation error for password:missingDigit from Server Action', async () => {
    mockSignUp.mockResolvedValue({ error: 'password:missingDigit' });

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

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(screen.getByText('missingDigit')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show password validation error for password:weak from Server Action', async () => {
    mockSignUp.mockResolvedValue({ error: 'password:weak' });

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

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(screen.getByText('weak')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show generic error for unknown password: prefixed key from Server Action', async () => {
    mockSignUp.mockResolvedValue({ error: 'password:unknownKey' });

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

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(screen.getByText('emailSignUpError')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show error message when signUp fails', async () => {
    mockSignUp.mockResolvedValue({ error: 'signUpFailed' });

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

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(screen.getByText('emailSignUpError')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show rate limited error', async () => {
    mockSignUp.mockResolvedValue({ error: 'rateLimited' });

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

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

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
