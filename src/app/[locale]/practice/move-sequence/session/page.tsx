import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageDescription, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { MoveSequenceSession } from '../_components/MoveSequenceSession';
import { decodeMoveSequenceFromBase64, validateFEN } from '../_lib/share';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/move-sequence/session' }),
    title: `${t('practice.moveSequence.title')} - ${t('practice.moveSequence.session')}`,
    description: t('practice.moveSequence.description'),
  };
}

export default async function MoveSequenceSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  // Parse query parameters
  const dataParam = search.data;
  const includeOpponentMovesParam = search.includeOpponentMoves;

  let fen: string | null = null;
  let pgn: string | null = null;
  let error: string | null = null;
  let includeOpponentMoves = false;

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
    <div className="space-y-8">
      <PageTitle>{t('practice.moveSequence.title')}</PageTitle>

      <PageDescription>{t('practice.moveSequence.description')}</PageDescription>

      <MoveSequenceSession
        locale={locale}
        fen={fen}
        pgn={pgn}
        includeOpponentMoves={includeOpponentMoves}
        error={error}
      />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.moveSequence.title'), href: '/practice/move-sequence' },
          { label: t('practice.moveSequence.session') },
        ]}
        locale={locale}
      />
    </div>
  );
}
