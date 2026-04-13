import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

import { getPositionById } from '@/lib/positions/queries';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SinglePositionSession } from '../../_components/session/SinglePositionSession';
import { clampTimeLimit } from '../../_lib/session-config';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory' }),
    title: resolveTitle(`${t('title')} - ${t('session')}`, locale),
  };
}

export default async function PositionSessionPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const timeLimit = clampTimeLimit(sp.timeLimit);

  const position = await getPositionById({ id, type: 'memory' });

  if (!position) {
    notFound();
  }

  const isBlackToMove = isBlackToMoveFromFen(position.fen);

  return (
    <SinglePositionSession
      locale={locale}
      positionId={position.id}
      timeLimit={timeLimit}
      position={{ fen: position.fen, isBlackToMove }}
    />
  );
}
