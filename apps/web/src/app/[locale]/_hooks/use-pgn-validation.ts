'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { validatePgnWithDetails } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';

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
 */
export function usePgnValidation({
  debouncedValue,
  showValidation = true,
}: UsePgnValidationOptions) {
  const t = useTranslations('pgnInput');

  const validationResult =
    showValidation && debouncedValue.trim() ? validatePgnWithDetails(debouncedValue) : null;

  const showSuccess = Boolean(showValidation && validationResult?.valid && debouncedValue.trim());
  const showError = Boolean(showValidation && validationResult && !validationResult.valid);

  // Extract invalid move from error message
  const getInvalidMove = (): string | null => {
    if (!validationResult?.error) {
      return null;
    }

    // Parse "Invalid move in PGN: xyz" pattern (older chess.js)
    const moveErrorMatch = validationResult.error.match(/Invalid move in PGN: (.+)/);
    if (moveErrorMatch) {
      return moveErrorMatch[1];
    }

    // Parse 'Expected ... but "X" found.' pattern (newer chess.js PGN parser)
    const parserErrorMatch = validationResult.error.match(/but "(.+)" found/);
    if (parserErrorMatch) {
      return parserErrorMatch[1];
    }

    return null;
  };

  const invalidMove = getInvalidMove();

  // Get translated error message
  const getErrorMessage = (): string => {
    if (invalidMove) {
      return t('invalidMove', { move: invalidMove });
    }
    return t('invalidPgn');
  };

  return {
    showSuccess,
    showError,
    invalidMove,
    errorMessage: showError ? getErrorMessage() : null,
  };
}
