import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CoordinateQuizChallengeSetup } from './_components/CoordinateQuizChallengeSetup';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    orientation?: string;
    feedbackSpeed?: string;
  }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/coordinate-quiz/challenge' }),
    title: `${t('practice.coordinateQuiz.title')} - ${t('practice.modeTimed')}`,
    description: t('practice.coordinateQuiz.description'),
  };
}

export default async function CoordinateQuizChallengePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { orientation, feedbackSpeed } = await searchParams;
  const t = await getTranslations({ locale });

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.coordinateQuiz.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.coordinateQuiz.title'), href: '/practice/coordinate-quiz' },
        { label: t('practice.modeTimed') },
      ]}
    >
      <CoordinateQuizChallengeSetup
        locale={locale}
        boardOrientation={orientation || 'white'}
        feedbackSpeed={feedbackSpeed || 'normal'}
      />
    </PracticeSessionPage>
  );
}
