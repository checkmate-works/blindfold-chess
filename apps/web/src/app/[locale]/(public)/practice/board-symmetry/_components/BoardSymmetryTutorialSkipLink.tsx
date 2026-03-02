'use client';

import { TutorialSkipLink as SharedTutorialSkipLink } from '@/app/[locale]/(public)/practice/_components/TutorialSkipLink';
import type { Locale } from '@/app/[locale]/_lib/types';

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
