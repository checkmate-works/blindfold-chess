'use client';

import type { Locale } from '@/app/[locale]/_lib/types';
import { TutorialSkipLink as SharedTutorialSkipLink } from '@/app/[locale]/practice/_components/TutorialSkipLink';

export const BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY = 'boardSymmetryTutorialSkipped';

type Props = {
  locale: Locale;
};

export function BoardSymmetryTutorialSkipLink({ locale }: Props) {
  return (
    <SharedTutorialSkipLink
      locale={locale}
      storageKey={BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY}
      redirectPath="board-symmetry"
      translationNamespace="practice.boardSymmetry"
    />
  );
}
