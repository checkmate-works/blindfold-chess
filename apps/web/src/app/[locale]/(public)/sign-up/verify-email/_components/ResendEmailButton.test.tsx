import * as matchers from '@testing-library/jest-dom/matchers';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResendEmailButton } from './ResendEmailButton';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const mockResendEmail = vi.fn();

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params && 'seconds' in params) return `${key}:${params.seconds}`;
    return key;
  },
}));

vi.mock('../_actions/resendEmail', () => ({
  resendEmail: (...args: unknown[]) => mockResendEmail(...args),
}));

describe('ResendEmailButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render the resend button', () => {
    render(<ResendEmailButton email="test@example.com" />);

    expect(screen.getByRole('button', { name: 'resendButton' })).toBeInTheDocument();
  });

  it('should call resendEmail Server Action with the correct email on click', async () => {
    mockResendEmail.mockResolvedValue({ success: true });

    render(<ResendEmailButton email="test@example.com" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'resendButton' }));
    });

    expect(mockResendEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('should show success message after successful resend', async () => {
    mockResendEmail.mockResolvedValue({ success: true });

    render(<ResendEmailButton email="test@example.com" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'resendButton' }));
    });

    expect(screen.getByText('resendSuccess')).toBeInTheDocument();
  });

  it('should show error message when resend fails', async () => {
    mockResendEmail.mockResolvedValue({ error: 'resendFailed' });

    render(<ResendEmailButton email="test@example.com" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'resendButton' }));
    });

    expect(screen.getByText('resendError')).toBeInTheDocument();
  });

  it('should show rate limited error', async () => {
    mockResendEmail.mockResolvedValue({ error: 'rateLimited' });

    render(<ResendEmailButton email="test@example.com" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'resendButton' }));
    });

    expect(screen.getByText('rateLimited')).toBeInTheDocument();
  });

  it('should show loading state while resending', async () => {
    let resolveResend: (value: unknown) => void;
    mockResendEmail.mockReturnValue(
      new Promise((resolve) => {
        resolveResend = resolve;
      })
    );

    render(<ResendEmailButton email="test@example.com" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('resendLoading')).toBeInTheDocument();

    await act(async () => {
      resolveResend!({ success: true });
    });
  });

  it('should disable the button when email is empty', () => {
    render(<ResendEmailButton email="" />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should start cooldown after successful resend', async () => {
    mockResendEmail.mockResolvedValue({ success: true });

    render(<ResendEmailButton email="test@example.com" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'resendButton' }));
    });

    // Button should show cooldown text
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('resendCooldown:60')).toBeInTheDocument();

    // Advance time by 1 second
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('resendCooldown:59')).toBeInTheDocument();
  });

  it('should re-enable button after cooldown expires', async () => {
    mockResendEmail.mockResolvedValue({ success: true });

    render(<ResendEmailButton email="test@example.com" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'resendButton' }));
    });

    // Advance through entire cooldown
    for (let i = 0; i < 60; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }

    expect(screen.getByRole('button')).not.toBeDisabled();
    expect(screen.getByText('resendButton')).toBeInTheDocument();
  });
});
