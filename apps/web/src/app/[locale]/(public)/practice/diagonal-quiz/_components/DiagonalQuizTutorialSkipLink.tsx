'use client';

import { TutorialSkipLink as SharedTutorialSkipLink } from '@/app/[locale]/(public)/practice/_components/TutorialSkipLink';
import type { Locale } from '@/app/[locale]/_lib/types';

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
