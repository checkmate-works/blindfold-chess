'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

export type MoveSubmitLabels = {
  positionInvalid: string;
  maxMovesReached: string;
  invalidMove: string;
};

export function useMoveSubmitLabels(): MoveSubmitLabels {
  const t = useTranslations('practice.puzzle.create');
  const tPlay = useTranslations('play');
  return useMemo(
    () => ({
      positionInvalid: t('positionInvalid'),
      maxMovesReached: t('maxMovesReached'),
      invalidMove: tPlay('invalidMove'),
    }),
    [t, tPlay]
  );
}
