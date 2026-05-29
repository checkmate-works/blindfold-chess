'use client';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeHowToPlayCard } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeHowToPlayCard';
import { PracticeSetupActions } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeSetupActions';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function DiagonalQuizSetup({ locale }: Props) {
  const t = useTranslations('practice.diagonalQuiz');

  return (
    <div>
      <div className="mb-8">
        <PracticeHowToPlayCard
          title={t('howToPlayTitle')}
          description={t('howToPlayDescription')}
          marginClassName="mb-2"
        >
          <div className="text-5xl font-bold text-foreground mb-4">e4</div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{t('diagonalLabel')}: ??-??</p>
            <p>{t('antiDiagonalLabel')}: ??-??</p>
          </div>
        </PracticeHowToPlayCard>
        <div className="mb-6 text-center" data-tour-id="diagonal-quiz-tutorial">
          <Link
            href={`/${locale}/practice/diagonal-quiz/tutorial`}
            className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}
          >
            {t('tutorial.viewTutorial')}
          </Link>
        </div>

        <PracticeSetupActions
          locale={locale}
          moduleSlug="diagonal-quiz"
          challengeTourId="diagonal-quiz-challenge"
          trainingTourId="diagonal-quiz-training"
        />
      </div>
    </div>
  );
}
