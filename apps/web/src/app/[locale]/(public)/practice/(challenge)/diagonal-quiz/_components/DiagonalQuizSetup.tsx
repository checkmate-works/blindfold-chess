'use client';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeSetupActions } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeSetupActions';
import { SectionTitle } from '@/app/[locale]/_components';
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
        <SectionTitle className="mb-4">{t('howToPlayTitle')}</SectionTitle>
        <div className="mb-2 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">{t('howToPlayDescription')}</p>
          <div className="text-5xl font-bold text-foreground mb-4">e4</div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{t('diagonalLabel')}: ??-??</p>
            <p>{t('antiDiagonalLabel')}: ??-??</p>
          </div>
        </div>
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
