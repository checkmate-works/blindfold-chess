import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FenSession } from '../_components/FenSession';

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

/**
 * Decode Base64 string to FEN strings
 * Returns null if decoding fails
 */
function decodeFensFromBase64(encoded: string): string[] | null {
  try {
    const decoded = atob(encoded);
    return decoded.split('\n').filter((line) => line.trim());
  } catch {
    return null;
  }
}

export default async function FenSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  // Parse query parameters
  const problemsParam = search.problems;
  const countParam = search.count;
  const shuffleParam = search.shuffle;
  const modeParam = search.mode;
  const fenParam = search.fen;

  // Decode problems from base64 if provided
  let fens: string[] | null = null;
  if (problemsParam && typeof problemsParam === 'string') {
    fens = decodeFensFromBase64(problemsParam);
  }

  // Parse count
  let problemCount = fens?.length ?? 5;
  if (countParam && typeof countParam === 'string') {
    const parsed = parseInt(countParam);
    if (!isNaN(parsed) && parsed >= 1) {
      problemCount = parsed;
    }
  }

  const shuffle = shuffleParam === '1';
  const isTutorial = modeParam === 'tutorial';

  // Decode custom FEN if provided (for tutorial - single FEN)
  let customFen: string | null = null;
  if (fenParam && typeof fenParam === 'string') {
    try {
      customFen = decodeURIComponent(fenParam);
    } catch {
      // Invalid encoding, ignore
    }
  }

  const breadcrumbItems = [
    { label: t('navigation.practice'), href: '/practice' },
    { label: t('practice.fen.title'), href: '/practice/fen' },
    { label: t('practice.fen.session') },
  ];

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.fen.session')}</PageTitle>

      <FenSession
        locale={locale}
        problemCount={problemCount}
        shuffle={shuffle}
        isTutorial={isTutorial}
        customFen={customFen ?? undefined}
        fens={fens ?? undefined}
      />

      <Divider />

      <Breadcrumb items={breadcrumbItems} locale={locale} />
    </div>
  );
}
