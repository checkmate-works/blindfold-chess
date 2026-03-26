import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

const CoordinateQuizChallenge = dynamic(() => import('../_components/CoordinateQuizChallenge'));

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    orientation?: string;
    feedbackSpeed?: string;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/coordinate-quiz/challenge/session' }),
    title: `${t('practice.coordinateQuiz.title')} - ${t('practice.coordinateQuiz.session')}`,
    description: t('practice.coordinateQuiz.description'),
  };
}

export default async function CoordinateQuizChallengeSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { orientation, feedbackSpeed } = await searchParams;
  const t = await getTranslations({ locale });

  const orientationValue = orientation || 'white';
  const feedbackSpeedValue = feedbackSpeed || 'normal';

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.coordinateQuiz.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.coordinateQuiz.title'), href: '/practice/coordinate-quiz' },
        { label: t('practice.modeTimed'), href: '/practice/coordinate-quiz/challenge' },
        { label: t('practice.coordinateQuiz.session') },
      ]}
    >
      <CoordinateQuizChallenge
        locale={locale}
        initialBoardOrientation={orientationValue}
        initialFeedbackSpeed={feedbackSpeedValue}
      />
    </PracticeSessionPage>
  );
}
