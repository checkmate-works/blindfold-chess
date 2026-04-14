'use client';

import { TutorialSkipLink as SharedTutorialSkipLink } from '@/app/[locale]/(public)/practice/_components/TutorialSkipLink';
import type { Locale } from '@/app/[locale]/_lib/types';

import { TUTORIAL_SKIPPED_KEY } from '../_lib/session-config';

type Props = {
  locale: Locale;
};

export function TutorialSkipLink({ locale }: Props) {
  return (
    <SharedTutorialSkipLink
      locale={locale}
      storageKey={TUTORIAL_SKIPPED_KEY}
      redirectPath="position-memory"
      translationNamespace="practice.positionMemory"
    />
  );
}
