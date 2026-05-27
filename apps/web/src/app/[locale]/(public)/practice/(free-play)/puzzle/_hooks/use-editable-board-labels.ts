'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

/**
 * Locale-resolved label bag for `<EditableChessBoard />`. Shared by
 * the create + edit puzzle forms — both pull the same four keys from
 * the `practice.puzzle` namespace.
 */
export function useEditableBoardLabels() {
  const t = useTranslations('practice.puzzle');
  return useMemo(
    () => ({
      whitePieces: t('whitePieces'),
      blackPieces: t('blackPieces'),
      removePieceMode: t('removePieceMode'),
      placingPiece: t('placingPiece'),
    }),
    [t]
  );
}
