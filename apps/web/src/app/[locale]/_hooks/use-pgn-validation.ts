'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { validatePgnWithDetails } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';

type UsePgnValidationOptions = {
  /** The value to validate, typically the *debounced* PGN content */
  debouncedValue: string;
  /** Whether validation should run at all */
  showValidation?: boolean;
};

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
