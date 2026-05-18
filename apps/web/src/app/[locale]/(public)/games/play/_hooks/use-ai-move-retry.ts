'use client';

import { useCallback, useState } from 'react';

type UseAiMoveRetryOptions = {
  /** `play`-namespace translator, used for the `aiMoveFailed` message. */
  t: (key: 'aiMoveFailed') => string;
  /** Sets the generic move-error slot (shared with the invalid-move path). */
  setError: (message: string | null) => void;
  /** Clears the preserved last-attempted input string. */
  setLastAttemptedInput: (value: string) => void;
  /** Toggles the orchestration trigger that drives the next AI move. */
  setShouldMakeAiMove: (value: boolean) => void;
  /** Tears down and recreates the AI opponent Worker. */
  resetAiOpponent: () => void;
};

type UseAiMoveRetryReturn = {
  /** AI-move failure message, or `null` when the last AI move succeeded. */
  aiMoveError: string | null;
  /** Orchestration `onAiMoveError` callback — records the failure. */
  handleAiMoveError: () => void;
  /** Retries the failed AI move with a freshly recreated opponent. */
  retryAiMove: () => void;
  /** Clears only the AI-move error (used by the generic error-clear path). */
  clearAiMoveError: () => void;
};

/**
 * Owns the AI-move failure + retry state machine, kept separate from the
 * generic `error` slot so the UI can tell "AI move failed" (offer a Retry
 * button) apart from "invalid move" (no Retry — the user just edits input).
 *
 * Extracted from `useGameSession` so the failure/retry concern is one
 * cohesive unit rather than three callbacks and a `useState` scattered
 * through the session hook.
 */
export function useAiMoveRetry({
  t,
  setError,
  setLastAttemptedInput,
  setShouldMakeAiMove,
  resetAiOpponent,
}: UseAiMoveRetryOptions): UseAiMoveRetryReturn {
  const [aiMoveError, setAiMoveError] = useState<string | null>(null);

  const handleAiMoveError = useCallback(() => {
    const message = t('aiMoveFailed');
    setError(message);
    setAiMoveError(message);
    setLastAttemptedInput('');
    setShouldMakeAiMove(false);
  }, [t, setError, setLastAttemptedInput, setShouldMakeAiMove]);

  const retryAiMove = useCallback(() => {
    // Clear the error state synchronously so the Retry button unmounts on
    // the first click; a fast double-click during the recreate window would
    // otherwise re-enter this callback (isLoading stays false until the
    // orchestration effect schedules).
    setError(null);
    setAiMoveError(null);
    setLastAttemptedInput('');
    // Tear down the current opponent so the next `getAiMove` call spins up
    // a fresh Worker. `reset` is synchronous: it bumps a counter that
    // re-runs `useAiVersus`'s effect, which destroys the old opponent and
    // constructs a new one before the next render-driven orchestration
    // round can observe it.
    resetAiOpponent();
    setShouldMakeAiMove(true);
  }, [setError, setLastAttemptedInput, resetAiOpponent, setShouldMakeAiMove]);

  const clearAiMoveError = useCallback(() => setAiMoveError(null), []);

  return { aiMoveError, handleAiMoveError, retryAiMove, clearAiMoveError };
}
