'use client';

import { TutorialSkipLink as SharedTutorialSkipLink } from '@/app/[locale]/(public)/practice/_components/TutorialSkipLink';
import type { Locale } from '@/app/[locale]/_lib/types';

export const TUTORIAL_SKIPPED_KEY = 'fenTutorialSkipped';

type Props = {
  locale: Locale;
};

export function TutorialSkipLink({ locale }: Props) {
  return (
    <SharedTutorialSkipLink
      locale={locale}
      storageKey={TUTORIAL_SKIPPED_KEY}
      redirectPath="fen"
      translationNamespace="practice.fen"
    />
  );
}
