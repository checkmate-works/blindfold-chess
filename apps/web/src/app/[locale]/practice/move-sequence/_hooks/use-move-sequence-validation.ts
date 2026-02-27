import { useCallback, useEffect, useRef } from 'react';

import { useTranslations } from 'next-intl';

import { validateFen } from '@blindfold-chess/features/chess-core';

import { parseMoveSequence } from '../_lib/pgn-parser';

const MAX_MOVES = 50;

export function useMoveSequenceValidation(setError: (error: string | null) => void) {
  const t = useTranslations('practice.moveSequence');
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup validation timer on unmount
  useEffect(() => {
    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, []);

  const validateInput = useCallback(
    (fenValue: string, pgnValue: string): string | null => {
      if (!fenValue.trim() || !pgnValue.trim()) {
        return null;
      }

      if (!validateFen(fenValue.trim())) {
        return t('invalidFen');
      }

      const result = parseMoveSequence(fenValue.trim(), pgnValue.trim());
      if (!result.success) {
        if (result.error.includes('No moves found')) {
          return t('noMovesFound');
        }
        if (result.error.includes('No valid moves found')) {
          return t('noMovesFound');
        }
        if (result.error.includes('Invalid FEN')) {
          return t('invalidFen');
        }
        const moveErrorMatch = result.error.match(/Move (\d+) "([^"]+)" is invalid/);
        if (moveErrorMatch) {
          return t('invalidMoveAt', { index: moveErrorMatch[1], move: moveErrorMatch[2] });
        }
        return t('invalidPgn');
      }

      if (result.data.moves.length > MAX_MOVES) {
        return t('pgnTooLong', { max: MAX_MOVES });
      }

      return null;
    },
    [t]
  );

  const runValidation = useCallback(
    (fenValue: string, pgnValue: string) => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
      validationTimerRef.current = setTimeout(() => {
        const validationError = validateInput(fenValue, pgnValue);
        setError(validationError);
      }, 500);
    },
    [validateInput, setError]
  );

  return { validateInput, runValidation };
}
