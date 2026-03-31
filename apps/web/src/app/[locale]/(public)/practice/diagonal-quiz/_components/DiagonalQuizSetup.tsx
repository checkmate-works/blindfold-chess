'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
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

        <SectionTitle className="mb-4">{t('howToPlayTitle')}</SectionTitle>
        <div className="mb-6 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">{t('howToPlayDescription')}</p>
          <div className="text-5xl font-bold text-foreground mb-4">e4</div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{t('diagonalLabel')}: ??-??</p>
            <p>{t('antiDiagonalLabel')}: ??-??</p>
          </div>
        </div>

        <Link href={`/${locale}/practice/diagonal-quiz/challenge`}>
          <Button asChild variant="primary" size="lg" icon={<FaPlay />} className="w-full">
            {tp('startChallenge')}
          </Button>
        </Link>
        <div className="mt-4 text-center">
          <Link
            href={`/${locale}/practice/diagonal-quiz/training#diagonal-quiz-training-session`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tp('switchToTraining')}
          </Link>
        </div>

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
