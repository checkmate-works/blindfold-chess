'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { MoveInputMethod } from '@/lib/games/saved-game-types';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Params = {
  onSubmit: (move: AlgebraicNotation) => boolean | void | Promise<void>;
  onMoveCommitted?: (inputMethod: MoveInputMethod) => void;
  onMovePeek?: () => void;
  /** The active input mode — switching it resets the feedback state. */
  currentMode: GamePreferences['moveInputMode'];
  onErrorClear: () => void;
};

type Result = {
  /** Shake + ring target for the input area. */
  inputAreaRef: React.RefObject<HTMLDivElement | null>;
  /** Consecutive rejected submissions, drives the "show legal moves" hint. */
  invalidAttemptCount: number;
  showLegalMoves: boolean;
  handleSubmitWithTracking: (move: AlgebraicNotation, inputMethod: MoveInputMethod) => void;
  handleShowLegalMoves: () => void;
};

/**
 * The move-input feedback state machine extracted from `MoveInputPanel`: it
 * tracks consecutive invalid submissions (to offer the legal-moves hint),
 * fires a one-shot shake of the input area on each rejected submit, and resets
 * itself (clearing any active error) when the input mode changes.
 *
 * Counting happens directly in the submit wrapper (not via an effect on
 * `error`), so it reliably increments even when the same invalid move is
 * submitted repeatedly. The shake is transform-only and skipped under
 * `prefers-reduced-motion`, where the persistent red ring carries the feedback.
 */
export function useMoveSubmitTracking({
  onSubmit,
  onMoveCommitted,
  onMovePeek,
  currentMode,
  onErrorClear,
}: Params): Result {
  const [invalidAttemptCount, setInvalidAttemptCount] = useState(0);
  const [showLegalMoves, setShowLegalMoves] = useState(false);
  // Bumped on every rejected submit — drives the one-shot shake.
  const [invalidShakeKey, setInvalidShakeKey] = useState(0);
  const inputAreaRef = useRef<HTMLDivElement>(null);

  const handleShowLegalMoves = useCallback(() => {
    setShowLegalMoves(true);
    setInvalidAttemptCount(0);
    onMovePeek?.();
  }, [onMovePeek]);

  const handleSubmitWithTracking = useCallback(
    (move: AlgebraicNotation, inputMethod: MoveInputMethod) => {
      const result = onSubmit(move);
      if (result === false) {
        setInvalidAttemptCount((prev) => prev + 1);
        setInvalidShakeKey((k) => k + 1);
      } else {
        setInvalidAttemptCount(0);
        setShowLegalMoves(false);
        onMoveCommitted?.(inputMethod);
      }
    },
    [onSubmit, onMoveCommitted]
  );

  // Reset the hint state when the input mode changes, clearing any active move
  // error too. `onErrorClear` is read through a ref so a non-stable consumer
  // callback cannot re-fire this effect and reset the counter on every error.
  const onErrorClearRef = useRef(onErrorClear);
  useEffect(() => {
    onErrorClearRef.current = onErrorClear;
  }, [onErrorClear]);

  useEffect(() => {
    setShowLegalMoves(false);
    setInvalidAttemptCount(0);
    onErrorClearRef.current();
  }, [currentMode]);

  // One-shot horizontal shake of the input area on each rejected submit.
  useEffect(() => {
    if (invalidShakeKey === 0) return;
    const el = inputAreaRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const animation = el.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(-2px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 360, easing: 'ease-in-out' }
    );
    return () => animation.cancel();
  }, [invalidShakeKey]);

  return {
    inputAreaRef,
    invalidAttemptCount,
    showLegalMoves,
    handleSubmitWithTracking,
    handleShowLegalMoves,
  };
}
