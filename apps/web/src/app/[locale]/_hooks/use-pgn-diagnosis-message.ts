'use client';

import { useCallback } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { PgnDiagnosis } from '@blindfold-chess/features/chess-core';

/**
 * Translate a {@link PgnDiagnosis} into display text.
 *
 * The split is deliberate: `packages/features` decides *what* is wrong with a
 * PGN (and where), this decides *how to say it* — the package is shared with
 * mobile and knows nothing about next-intl, so message keys cannot live there.
 *
 * One `pgnDiagnosis` namespace serves every PGN surface (kata import, line
 * editor, game import, recall setup, post attachments) so the same bad paste
 * gets the same sentence wherever it is pasted.
 */
export function usePgnDiagnosisMessage(): (diagnosis: PgnDiagnosis | null) => string | null {
  const t = useTranslations('pgnDiagnosis');

  return useCallback(
    (diagnosis: PgnDiagnosis | null) => {
      if (!diagnosis) return null;
      switch (diagnosis.code) {
        case 'illegalMove':
          return t('illegalMove', {
            san: diagnosis.san,
            // Strings, not numbers: these are notation, and a numeric argument
            // would pick up locale digit grouping ("1,024").
            moveNumber: String(diagnosis.moveNumber),
            ply: String(diagnosis.ply),
          });
        case 'illegalMoveUnlocated':
          return t('illegalMoveUnlocated', { san: diagnosis.san });
        case 'noMoves':
          return t('noMoves');
        case 'unreadable':
          return t('unreadable');
      }
    },
    [t]
  );
}
