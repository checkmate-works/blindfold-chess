/**
 * FEN Reconstruction Session (FEN再構築 練習中, `/practice/fen/session`)
 *
 * @description
 * Runs the FEN reconstruction exercise over the Base64-encoded FEN list passed in the query string.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { parseSessionFens, parseTutorialFen } from '../_lib/session-params';

const FenSession = dynamic(() => import('../_components/FenSession').then((mod) => mod.FenSession));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const title = `${t('practice.fen.title')} - ${t('practice.fen.session')}`;

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/fen/session', title }),
    title: resolveTitle(title, locale),
  };
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

  const fens = parseSessionFens(problemsParam);

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

  // The single position the tutorial starts with.
  const customFen = parseTutorialFen(fenParam);

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.fen.session')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.fen.title'), href: '/practice/fen' },
        { label: t('practice.fen.session') },
      ]}
    >
      <FenSession
        locale={locale}
        problemCount={problemCount}
        shuffle={shuffle}
        isTutorial={isTutorial}
        customFen={customFen ?? undefined}
        fens={fens ?? undefined}
      />
    </PracticeSessionPage>
  );
}
