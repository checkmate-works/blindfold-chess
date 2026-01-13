import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FenSession } from '../_components/FenSession';
import { FEN_PROBLEMS } from '../_data/positions';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/fen/session' }),
    title: t('practice.fen.session'),
  };
}

export default async function FenSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  // Parse query parameters
  const countParam = search.count;
  const shuffleParam = search.shuffle;

  const maxProblems = FEN_PROBLEMS.length;

  let problemCount = maxProblems;
  if (countParam && typeof countParam === 'string') {
    const parsed = parseInt(countParam);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= maxProblems) {
      problemCount = parsed;
    }
  }

  const shuffle = shuffleParam === '1';

  const breadcrumbItems = [
    { label: t('navigation.practice'), href: '/practice' },
    { label: t('practice.fen.title'), href: '/practice/fen' },
    { label: t('practice.fen.session') },
  ];

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.fen.session')}</PageTitle>

      <FenSession locale={locale} problemCount={problemCount} shuffle={shuffle} />

      <Divider />

      <Breadcrumb items={breadcrumbItems} locale={locale} />
    </div>
  );
}
