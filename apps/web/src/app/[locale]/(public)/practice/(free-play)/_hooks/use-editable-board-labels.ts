'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

/**
 * Locale-resolved label bag for `<EditableChessBoard />`.
 *
 * Five editors mount that board — the puzzle create/edit forms, the
 * position-memory form and its recreate step, the FEN recreate step, the chunk
 * form and the custom-position game form — and each needs the same four keys.
 * The keys are identical in every namespace, so the namespace is the only
 * thing a caller has to supply; pass the dotted path a group sits under
 * (`'newGame.positionSettings'`) rather than a prefix.
 */
export function useEditableBoardLabels(namespace: string) {
  const t = useTranslations(namespace);
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
