import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { SUPPORTED_LOCALES } from '@/config';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

const DiagonalQuizSession = dynamic(() => import('../_components/DiagonalQuizSession'));

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    timeLimit?: string;
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
    ...generateCanonicalMetadata({ locale, path: 'practice/diagonal-quiz/challenge/session' }),
    title: `${t('practice.diagonalQuiz.title')} - ${t('practice.diagonalQuiz.session')}`,
    description: t('practice.diagonalQuiz.description'),
  };
}

export default async function DiagonalQuizChallengeSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { timeLimit } = await searchParams;
  const t = await getTranslations({ locale });

  const timeLimitValue = timeLimit ? parseInt(timeLimit, 10) : 60;

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.diagonalQuiz.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.diagonalQuiz.title'), href: '/practice/diagonal-quiz' },
        { label: t('practice.modeTimed'), href: '/practice/diagonal-quiz/challenge' },
        { label: t('practice.diagonalQuiz.session') },
      ]}
    >
      <DiagonalQuizSession locale={locale} initialTimeLimit={timeLimitValue} />
    </PracticeSessionPage>
  );
}
