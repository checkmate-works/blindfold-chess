import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { decodeMoveSequenceFromBase64, validateFEN } from '../_lib/share';

const MoveSequenceSession = dynamic(() =>
  import('../_components/MoveSequenceSession').then((mod) => mod.MoveSequenceSession)
);

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const title = `${t('practice.moveSequence.title')} - ${t('practice.moveSequence.session')}`;
  const description = t('practice.moveSequence.description');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: 'practice/move-sequence/session',
      title: title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function MoveSequenceSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  // Parse query parameters
  const dataParam = search.data;
  const includeOpponentMovesParam = search.includeOpponentMoves;
  const skipMemorizeParam = search.skipMemorize;
  const modeParam = search.mode;

  let fen: string | null = null;
  let pgn: string | null = null;
  let error: string | null = null;
  let includeOpponentMoves = false;
  const skipMemorize = skipMemorizeParam === '1';
  const isTutorial = modeParam === 'tutorial';

  if (dataParam && typeof dataParam === 'string') {
    const decoded = decodeMoveSequenceFromBase64(dataParam);

    if (!decoded) {
      error = 'invalid_data';
    } else if (!validateFEN(decoded.fen)) {
      error = 'invalid_fen';
    } else {
      fen = decoded.fen;
      pgn = decoded.pgn;
    }
  }

  if (includeOpponentMovesParam === '1') {
    includeOpponentMoves = true;
  }

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.moveSequence.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.moveSequence.title'), href: '/practice/move-sequence' },
        { label: t('practice.moveSequence.session') },
      ]}
    >
      <MoveSequenceSession
        locale={locale}
        fen={fen}
        pgn={pgn}
        includeOpponentMoves={includeOpponentMoves}
        skipMemorize={skipMemorize}
        isTutorial={isTutorial}
        error={error}
      />
    </PracticeSessionPage>
  );
}
