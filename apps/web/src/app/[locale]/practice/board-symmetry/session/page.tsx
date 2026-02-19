import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeSessionPage } from '@/app/[locale]/practice/_components/PracticeSessionPage';

import BoardSymmetrySession from '../_components/BoardSymmetrySession';

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
    ...generateCanonicalMetadata({ locale, path: 'practice/board-symmetry/session' }),
    title: `${t('practice.boardSymmetry.title')} - ${t('practice.session')}`,
    description: t('practice.boardSymmetry.description'),
  };
}

export default async function BoardSymmetrySessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { timeLimit } = await searchParams;
  const t = await getTranslations({ locale });

  const timeLimitValue = timeLimit ? parseInt(timeLimit, 10) : 60;

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.boardSymmetry.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.boardSymmetry.title'), href: '/practice/board-symmetry' },
        { label: t('practice.session') },
      ]}
    >
      <BoardSymmetrySession locale={locale} initialTimeLimit={timeLimitValue} />
    </PracticeSessionPage>
  );
}
