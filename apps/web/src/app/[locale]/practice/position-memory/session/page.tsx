import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageDescription, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionMemorySession } from '../_components/PositionMemorySession';
import { decodeFensFromBase64, validateFEN } from '../_lib/utils';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory/session' }),
    title: `${t('practice.positionMemory.title')} - ${t('practice.positionMemory.session')}`,
    description: t('practice.positionMemory.description'),
  };
}

export default async function PositionMemorySessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  // Parse query parameters
  const problemsParam = search.problems;
  const timeLimitParam = search.timeLimit;
  const shuffleParam = search.shuffle;
  const problemCountParam = search.count;

  // Parse FENs if provided
  let fens: string[] | undefined;
  if (problemsParam && typeof problemsParam === 'string') {
    const decodedFens = decodeFensFromBase64(problemsParam);
    if (decodedFens && decodedFens.every((fen) => validateFEN(fen))) {
      fens = decodedFens;
    }
  }

  // Parse time limit (default: 10 seconds)
  let timeLimit = 10;
  if (timeLimitParam && typeof timeLimitParam === 'string') {
    const parsed = parseInt(timeLimitParam);
    if (!isNaN(parsed) && parsed >= 5 && parsed <= 60) {
      timeLimit = parsed;
    }
  }

  // Parse shuffle (default: true)
  let shuffle = true;
  if (shuffleParam && typeof shuffleParam === 'string') {
    shuffle = shuffleParam === '1';
  }

  // Parse problem count (default: 1)
  let problemCount = 1;
  if (problemCountParam && typeof problemCountParam === 'string') {
    const parsed = parseInt(problemCountParam);
    if (!isNaN(parsed) && parsed >= 1) {
      problemCount = parsed;
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.positionMemory.title')}</PageTitle>

      <PageDescription>{t('practice.positionMemory.description')}</PageDescription>

      <PositionMemorySession
        locale={locale}
        fens={fens}
        timeLimit={timeLimit}
        shuffle={shuffle}
        problemCount={problemCount}
      />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.positionMemory.title'), href: '/practice/position-memory' },
          { label: t('practice.positionMemory.session') },
        ]}
        locale={locale}
      />
    </div>
  );
}
