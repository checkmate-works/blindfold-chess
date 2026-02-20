import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeSessionPage } from '@/app/[locale]/practice/_components/PracticeSessionPage';

import CoordinateQuizChallenge from './_components/CoordinateQuizChallenge';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    timeLimit?: string;
    boardOrientation?: string;
    feedbackSpeed?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/coordinate-quiz/challenge' }),
    title: `${t('practice.coordinateQuiz.title')} - ${t('practice.coordinateQuiz.session')}`,
    description: t('practice.coordinateQuiz.description'),
  };
}

export default async function CoordinateQuizChallengePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { timeLimit, boardOrientation, feedbackSpeed } = await searchParams;
  const t = await getTranslations({ locale });

  const timeLimitValue = timeLimit ? parseInt(timeLimit, 10) : 60;
  const orientationValue = boardOrientation || 'white';
  const feedbackSpeedValue = feedbackSpeed || 'normal';

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.coordinateQuiz.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.coordinateQuiz.title'), href: '/practice/coordinate-quiz' },
        { label: t('practice.coordinateQuiz.session') },
      ]}
    >
      <CoordinateQuizChallenge
        locale={locale}
        initialTimeLimit={timeLimitValue}
        initialBoardOrientation={orientationValue}
        initialFeedbackSpeed={feedbackSpeedValue}
      />
    </PracticeSessionPage>
  );
}
