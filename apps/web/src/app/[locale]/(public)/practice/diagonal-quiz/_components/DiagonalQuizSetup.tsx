'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { BetaNotice, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DIAGONAL_QUIZ_TUTORIAL_SKIPPED_KEY } from './DiagonalQuizTutorialSkipLink';

type Props = {
  locale: Locale;
};

export function DiagonalQuizSetup({ locale }: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const tp = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    router.push(`/${locale}/practice/diagonal-quiz/training#diagonal-quiz-training-session`);
  };

  const handleViewTutorial = () => {
    localStorage.removeItem(DIAGONAL_QUIZ_TUTORIAL_SKIPPED_KEY);
    router.push(`/${locale}/practice/diagonal-quiz/tutorial`);
  };

  return (
    <div>
      <div className="mb-8">
        <BetaNotice className="mb-6">
          <p>{t('betaNotice')}</p>
        </BetaNotice>

        <SectionTitle className="mb-4">{t('settings')}</SectionTitle>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">{tp('trainingDescription')}</p>
        </div>

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full"
        >
          {tp('startTraining')}
        </Button>

        <div className="flex justify-center mt-6">
          <button
            onClick={handleViewTutorial}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {t('tutorial.viewTutorial')}
          </button>
        </div>
      </div>
    </div>
  );
}
