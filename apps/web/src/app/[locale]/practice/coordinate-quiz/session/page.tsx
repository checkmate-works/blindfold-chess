import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import CoordinateQuizSession from '../_components/CoordinateQuizSession';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    timeLimit?: string;
    boardOrientation?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/coordinate-quiz/session' }),
    title: `${t('practice.coordinateQuiz.title')} - ${t('practice.coordinateQuiz.session')}`,
    description: t('practice.coordinateQuiz.description'),
  };
}

export default async function CoordinateQuizSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { timeLimit, boardOrientation } = await searchParams;
  const t = await getTranslations({ locale });

  const timeLimitValue = timeLimit ? parseInt(timeLimit, 10) : 60;
  const orientationValue = boardOrientation || 'white';

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.coordinateQuiz.title')}</PageTitle>

      <CoordinateQuizSession
        locale={locale}
        initialTimeLimit={timeLimitValue}
        initialBoardOrientation={orientationValue}
      />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.coordinateQuiz.title'), href: '/practice/coordinate-quiz' },
          { label: t('practice.coordinateQuiz.session') },
        ]}
        locale={locale}
      />
    </div>
  );
}
