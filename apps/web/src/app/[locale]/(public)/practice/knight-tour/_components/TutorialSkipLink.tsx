'use client';

import type { Locale } from '@/app/[locale]/_lib/types';
import { TutorialSkipLink as SharedTutorialSkipLink } from '@/app/[locale]/practice/_components/TutorialSkipLink';

export const TUTORIAL_SKIPPED_KEY = 'knightTourTutorialSkipped';

type Props = {
  locale: Locale;
};

export function TutorialSkipLink({ locale }: Props) {
  return (
    <SharedTutorialSkipLink
      locale={locale}
      storageKey={TUTORIAL_SKIPPED_KEY}
      redirectPath="knight-tour"
      translationNamespace="practice.knightTour.tutorial"
      translationKey="skip"
    />
  );
}
