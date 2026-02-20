/**
 * Diagonal Quiz Training (斜めラインクイズトレーニング)
 *
 * @description
 * Untimed training mode for diagonal identification.
 * Questions continue infinitely until the user explicitly ends the session.
 * No timer, no result page -- navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) -> Countdown -> Infinite Q&A -> End button -> Setup + toast
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeSessionPage } from '@/app/[locale]/practice/_components/PracticeSessionPage';

import DiagonalQuizTrainingSession from './_components/DiagonalQuizTrainingSession';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/diagonal-quiz/training' }),
    title: `${t('practice.diagonalQuiz.title')} - ${t('practice.modeTraining')}`,
    description: t('practice.diagonalQuiz.description'),
  };
}

export default async function DiagonalQuizTrainingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.diagonalQuiz.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.diagonalQuiz.title'), href: '/practice/diagonal-quiz' },
        { label: t('practice.modeTraining') },
      ]}
    >
      <DiagonalQuizTrainingSession locale={locale} />
    </PracticeSessionPage>
  );
}
