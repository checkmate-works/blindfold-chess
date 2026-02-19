import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeSessionPage } from '@/app/[locale]/practice/_components/PracticeSessionPage';

import DiagonalQuizSession from '../_components/DiagonalQuizSession';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    timeLimit?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/diagonal-quiz/session' }),
    title: `${t('practice.diagonalQuiz.title')} - ${t('practice.diagonalQuiz.session')}`,
    description: t('practice.diagonalQuiz.description'),
  };
}

export default async function DiagonalQuizSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
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
        { label: t('practice.diagonalQuiz.session') },
      ]}
    >
      <DiagonalQuizSession locale={locale} initialTimeLimit={timeLimitValue} />
    </PracticeSessionPage>
  );
}
