'use client';

import { useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

export type MoveSubmitLabels = {
  positionInvalid: string;
  maxMovesReached: string;
  invalidMove: string;
  checkmateReached: string;
};

export function useMoveSubmitLabels(): MoveSubmitLabels {
  const t = useTranslations('practice.puzzle.create');
  const tPlay = useTranslations('play');
  return useMemo(
    () => ({
      positionInvalid: t('positionInvalid'),
      maxMovesReached: t('maxMovesReached'),
      invalidMove: tPlay('invalidMove'),
      checkmateReached: t('checkmateReached'),
    }),
    [t, tPlay]
  );
}
