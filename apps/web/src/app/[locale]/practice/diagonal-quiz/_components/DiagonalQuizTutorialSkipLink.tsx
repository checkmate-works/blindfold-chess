'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

export const DIAGONAL_QUIZ_TUTORIAL_SKIPPED_KEY = 'diagonalQuizTutorialSkipped';

type Props = {
  locale: Locale;
};

export function DiagonalQuizTutorialSkipLink({ locale }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.diagonalQuiz.tutorial');

  const handleSkip = () => {
    localStorage.setItem(DIAGONAL_QUIZ_TUTORIAL_SKIPPED_KEY, 'true');
    router.push(`/${locale}/practice/diagonal-quiz`);
  };

  return (
    <button
      onClick={handleSkip}
      className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
    >
      {t('skip')}
    </button>
  );
}
