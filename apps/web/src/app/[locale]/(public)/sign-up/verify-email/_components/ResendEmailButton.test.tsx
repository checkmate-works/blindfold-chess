import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResendEmailButton } from './ResendEmailButton';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const mockResend = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resend: mockResend,
    },
  }),
}));

describe('ResendEmailButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the resend button', () => {
    render(<ResendEmailButton email="test@example.com" />);

    expect(screen.getByRole('button', { name: 'resendButton' })).toBeInTheDocument();
  });

  it('should call resend with the correct email on click', async () => {
    mockResend.mockResolvedValue({ error: null });

    render(<ResendEmailButton email="test@example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'resendButton' }));

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
      });
    });
  });

  it('should show success message after successful resend', async () => {
    mockResend.mockResolvedValue({ error: null });

    render(<ResendEmailButton email="test@example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'resendButton' }));

    await waitFor(() => {
      expect(screen.getByText('resendSuccess')).toBeInTheDocument();
    });
  });

  it('should show error message when resend fails', async () => {
    mockResend.mockResolvedValue({ error: new Error('Failed to resend') });

    render(<ResendEmailButton email="test@example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'resendButton' }));

    await waitFor(() => {
      expect(screen.getByText('resendError')).toBeInTheDocument();
    });
  });

  it('should show loading state while resending', async () => {
    let resolveResend: (value: unknown) => void;
    mockResend.mockReturnValue(
      new Promise((resolve) => {
        resolveResend = resolve;
      })
    );

    render(<ResendEmailButton email="test@example.com" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByText('resendLoading')).toBeInTheDocument();
    });

    resolveResend!({ error: null });
  });

  it('should disable the button when email is empty', () => {
    render(<ResendEmailButton email="" />);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
