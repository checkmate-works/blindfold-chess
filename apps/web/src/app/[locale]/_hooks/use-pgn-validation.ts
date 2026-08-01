'use client';

import { diagnoseChessJsPgnError, diagnosePgn } from '@blindfold-chess/features/chess-core';
import type { PgnDiagnosis } from '@blindfold-chess/features/chess-core';

import { validatePgnWithDetails } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import { usePgnDiagnosisMessage } from '@/app/[locale]/_hooks/use-pgn-diagnosis-message';

type UsePgnValidationOptions = {
  /**
   * The PGN content to validate.
   *
   * IMPORTANT: This MUST already be debounced by the caller. The hook runs
   * `validatePgnWithDetails` synchronously in the render body on every change
   * to this value, and that call performs a full `chess.js` PGN parse. Passing
   * a raw keystroke-driven value will parse on every character and can cause
   * noticeable input lag on long games.
   *
   * Currently the only caller is `PgnInput`, which debounces via
   * `useDebouncedInput` (1000ms, with paste bypass). Any new caller must do
   * the equivalent — e.g., via `useDebouncedInput`, a manual
   * `useEffect` + `setTimeout`, or a form-submit-derived value.
   */
  debouncedValue: string;
  /** Whether validation should run at all */
  showValidation?: boolean;
};

/**
 * Derives UI validation state (success / error / invalid-move highlight /
 * localized error message) from an already-debounced PGN string.
 *
 * @remarks
 * This hook deliberately does NOT debounce internally. See
 * {@link UsePgnValidationOptions.debouncedValue} for the caller contract and
 * the reason (chess.js parsing cost on every render).
 *
 * Validity is chess.js's verdict, unchanged — this screen has always accepted
 * exactly what `loadPgn` accepts, and narrowing that silently is not a message
 * improvement. Only the *explanation* is upgraded: `diagnosePgn` re-parses the
 * rejected text to locate the offending move ("Can't play d7 at move 8, ply
 * 16"), and chess.js's own wording is consulted only when the two parsers
 * disagree — from inside chess-core, where knowing that wording belongs.
 */
export function usePgnValidation({
  debouncedValue,
  showValidation = true,
}: UsePgnValidationOptions) {
  const format = usePgnDiagnosisMessage();

  const validationResult =
    showValidation && debouncedValue.trim() ? validatePgnWithDetails(debouncedValue) : null;

  const showSuccess = Boolean(showValidation && validationResult?.valid && debouncedValue.trim());
  const showError = Boolean(showValidation && validationResult && !validationResult.valid);

  const diagnosis: PgnDiagnosis | null = showError
    ? (diagnosePgn(debouncedValue) ?? diagnoseChessJsPgnError(validationResult?.error ?? ''))
    : null;

  // The move name, when we have one — `PgnInput` turns the message into a
  // button that selects that text in the textarea.
  const invalidMove =
    diagnosis?.code === 'illegalMove' || diagnosis?.code === 'illegalMoveUnlocated'
      ? diagnosis.san
      : null;

  return {
    showSuccess,
    showError,
    invalidMove,
    errorMessage: format(diagnosis),
  };
}
