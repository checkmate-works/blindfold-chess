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

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
  }),
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
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText('confirmPasswordLabel'), {
      target: { value: 'short' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'emailSignUp' }));

    await waitFor(() => {
      expect(screen.getByText('passwordTooShort')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should call signUp with valid input and redirect to verify-email page', async () => {
    mockSignUp.mockResolvedValue({ error: null });

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
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'validpassword123',
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    });

    expect(mockPush).toHaveBeenCalledWith('/en/sign-up/verify-email?email=test%40example.com');
  });

  it('should show error message when signUp fails', async () => {
    mockSignUp.mockResolvedValue({ error: new Error('Sign up failed') });

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

    resolveSignUp!({ error: null });
  });
});
