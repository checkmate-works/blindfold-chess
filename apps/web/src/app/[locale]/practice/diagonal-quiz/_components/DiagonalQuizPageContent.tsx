'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizSetup } from './DiagonalQuizSetup';
import { DIAGONAL_QUIZ_TUTORIAL_SKIPPED_KEY } from './DiagonalQuizTutorialSkipLink';

type Props = {
  locale: Locale;
  timeLimit: number;
  onTimeLimitChange: (value: number) => void;
};

export function DiagonalQuizPageContent({ locale, timeLimit, onTimeLimitChange }: Props) {
  const router = useRouter();
  const [tutorialSkipped, setTutorialSkipped] = useState<boolean | null>(null);

  useEffect(() => {
    const skipped = localStorage.getItem(DIAGONAL_QUIZ_TUTORIAL_SKIPPED_KEY) === 'true';
    setTutorialSkipped(skipped);
  }, []);

  useEffect(() => {
    if (tutorialSkipped === false) {
      router.replace(`/${locale}/practice/diagonal-quiz/tutorial`);
    }
  }, [tutorialSkipped, locale, router]);

  if (tutorialSkipped === null || tutorialSkipped === false) {
    return null;
  }

  return (
    <DiagonalQuizSetup
      locale={locale}
      timeLimit={timeLimit}
      onTimeLimitChange={onTimeLimitChange}
    />
  );
}
