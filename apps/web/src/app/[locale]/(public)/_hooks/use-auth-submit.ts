'use client';

import { useState } from 'react';

/**
 * Owns the state machine shared by every email/password auth form (sign-in,
 * sign-up, forgot-password, reset-password): the `error` / `isLoading` state,
 * the `preventDefault` → clear → optional validate → set-loading → run-action
 * flow, the `'error' in result` server-error discrimination, and the
 * thrown-error catch. Each form supplies only the bits that differ — the
 * action, how to localize an error code, what to do on success, and any
 * pre-submit validation.
 */
interface UseAuthSubmitOptions<TSuccess extends object> {
  /** The server action to invoke on submit. */
  action: () => Promise<{ error: string } | TSuccess>;
  /**
   * Map a server-action error code to a localized message. Also invoked with
   * `'unknown'` when the action throws, so the same generic-fallback path
   * handles both cases.
   */
  resolveError: (error: string) => string;
  /** Run on success — typically navigates away or flips local UI state. */
  onSuccess: (result: TSuccess) => void;
  /**
   * Optional synchronous pre-submit validation. Return a localized error
   * message to abort before the action runs, or `null` to proceed.
   */
  validate?: () => string | null;
}

export interface UseAuthSubmitReturn {
  error: string;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useAuthSubmit<TSuccess extends object>({
  action,
  resolveError,
  onSuccess,
  validate,
}: UseAuthSubmitOptions<TSuccess>): UseAuthSubmitReturn {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (validate) {
      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await action();
      if ('error' in result) {
        setError(resolveError(result.error));
        setIsLoading(false);
        return;
      }
      // On success the form typically navigates away (or swaps to a "sent"
      // view), so `isLoading` is intentionally left set.
      onSuccess(result);
    } catch {
      setError(resolveError('unknown'));
      setIsLoading(false);
    }
  };

  return { error, isLoading, handleSubmit };
}
