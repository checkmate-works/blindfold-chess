import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

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
    <div className="space-y-8">
      <PageTitle>{t('practice.diagonalQuiz.title')}</PageTitle>

      <DiagonalQuizSession locale={locale} initialTimeLimit={timeLimitValue} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.diagonalQuiz.title'), href: '/practice/diagonal-quiz' },
          { label: t('practice.diagonalQuiz.session') },
        ]}
        locale={locale}
      />
    </div>
  );
}
