/**
 * Coordinate Quiz Training (座標クイズトレーニング)
 *
 * @description
 * Untimed training mode for coordinate identification.
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

import CoordinateQuizTrainingSession from './_components/CoordinateQuizTrainingSession';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    boardOrientation?: string;
    feedbackSpeed?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/coordinate-quiz/training' }),
    title: `${t('practice.coordinateQuiz.title')} - ${t('practice.modeTraining')}`,
    description: t('practice.coordinateQuiz.description'),
  };
}

export default async function CoordinateQuizTrainingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { boardOrientation, feedbackSpeed } = await searchParams;
  const t = await getTranslations({ locale });

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.coordinateQuiz.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.coordinateQuiz.title'), href: '/practice/coordinate-quiz' },
        { label: t('practice.modeTraining') },
      ]}
    >
      <CoordinateQuizTrainingSession
        locale={locale}
        boardOrientation={boardOrientation || 'white'}
        feedbackSpeed={feedbackSpeed || 'normal'}
      />
    </PracticeSessionPage>
  );
}
