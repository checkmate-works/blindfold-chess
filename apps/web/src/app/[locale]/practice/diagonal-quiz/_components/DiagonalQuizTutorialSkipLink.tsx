'use client';

import type { Locale } from '@/app/[locale]/_lib/types';
import { TutorialSkipLink as SharedTutorialSkipLink } from '@/app/[locale]/practice/_components/TutorialSkipLink';

export const DIAGONAL_QUIZ_TUTORIAL_SKIPPED_KEY = 'diagonalQuizTutorialSkipped';

type Props = {
  locale: Locale;
};

export function DiagonalQuizTutorialSkipLink({ locale }: Props) {
  return (
    <SharedTutorialSkipLink
      locale={locale}
      storageKey={DIAGONAL_QUIZ_TUTORIAL_SKIPPED_KEY}
      redirectPath="diagonal-quiz"
      translationNamespace="practice.diagonalQuiz.tutorial"
      translationKey="skip"
    />
  );
}
