import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { clampTimeLimit, parseDisplayMode } from '../_lib/session-config';
import { decodeFensFromBase64, validateFEN } from '../_lib/share-url';

const MultiProblemSession = dynamic(() =>
  import('../_components/session/MultiProblemSession').then((mod) => mod.MultiProblemSession)
);

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const title = `${t('practice.positionMemory.title')} - ${t('practice.positionMemory.session')}`;
  const description = t('practice.positionMemory.description');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: 'practice/position-memory/session',
      title: title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
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
  const modeParam = search.mode;
  const sourceParam = search.source;
  const displayModeParam = search.displayMode;

  // Parse FENs if provided
  let fens: string[] | undefined;
  if (problemsParam && typeof problemsParam === 'string') {
    const decodedFens = decodeFensFromBase64(problemsParam);
    if (decodedFens && decodedFens.every((fen) => validateFEN(fen))) {
      fens = decodedFens;
    }
  }

  // Parse time limit (default: 10 seconds for the multi-problem flow).
  const timeLimit = clampTimeLimit(timeLimitParam, { fallback: 10 });

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

  // Parse mode (default: custom)
  const mode = modeParam === 'tutorial' ? 'tutorial' : 'custom';

  // Parse source (default: preset)
  const isCustomFen = sourceParam === 'custom';

  // Parse skipMemorize (default: false)
  const skipMemorizeParam = search.skipMemorize;
  const skipMemorize = skipMemorizeParam === '1';

  const displayMode = parseDisplayMode(displayModeParam);

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.positionMemory.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.positionMemory.title'), href: '/practice/position-memory' },
        { label: t('practice.positionMemory.session') },
      ]}
    >
      <MultiProblemSession
        locale={locale}
        fens={fens}
        timeLimit={timeLimit}
        shuffle={shuffle}
        problemCount={problemCount}
        mode={mode}
        skipMemorize={skipMemorize}
        isCustomFen={isCustomFen}
        displayMode={displayMode}
        rawProblemsParam={typeof problemsParam === 'string' ? problemsParam : undefined}
        sourceParam={typeof sourceParam === 'string' ? sourceParam : undefined}
        modeParam={typeof modeParam === 'string' ? modeParam : undefined}
      />
    </PracticeSessionPage>
  );
}
