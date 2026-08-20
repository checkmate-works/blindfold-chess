import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import type { AlgebraicNotation } from '@blindfold-chess/types';

import { sanitizeNext } from '@/lib/safe-next';

import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { RecallSessionClient } from '../_components/RecallSessionClient';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const title = `${t('recall.title')} - ${t('recall.session')}`;

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/recall/session', title }),
    title: resolveTitle(title, locale),
  };
}

function parseMoves(movesParam: string | undefined): AlgebraicNotation[] | undefined {
  if (!movesParam) return undefined;
  try {
    const parsed = JSON.parse(movesParam);
    return Array.isArray(parsed) ? (parsed as AlgebraicNotation[]) : undefined;
  } catch {
    return undefined;
  }
}

export default async function RecallSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  const pgn = typeof search.pgn === 'string' ? search.pgn : undefined;
  // Pre-parsed SAN move array, set by the paste-PGN setup form (and, redundantly
  // but harmlessly, by the "Recall" deep-link from a finished game). Takes
  // precedence over `pgn` in useRecallInit — see that hook for why.
  const moves = parseMoves(typeof search.moves === 'string' ? search.moves : undefined);

  // Session has nothing to replay without a PGN or a move list — send the user
  // back to setup instead of rendering a broken review.
  if (!pgn && !moves) {
    redirect(`/${locale}/practice/recall`);
  }

  const playerColor = search.color === 'black' ? 'black' : 'white';
  const offset = typeof search.offset === 'string' ? parseInt(search.offset, 10) || 0 : 0;
  const startingFen = typeof search.fen === 'string' ? search.fen : undefined;
  const gameId = typeof search.gameId === 'string' ? search.gameId : undefined;
  // Where the summary's back link returns to (the mid-game recall entry sets
  // this to the live game's URL). Untrusted input — `sanitizeNext` rejects
  // anything that is not a same-origin absolute path, and the summary falls
  // back to its default back link when absent.
  const returnTo =
    sanitizeNext(typeof search.returnTo === 'string' ? search.returnTo : undefined) ?? undefined;

  return (
    <RecallSessionClient
      locale={locale}
      pgn={pgn ?? ''}
      moves={moves}
      playerColor={playerColor}
      initialOffset={offset}
      startingFen={startingFen}
      gameId={gameId}
      returnTo={returnTo}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('recall.title'), href: '/practice/recall' },
        { label: t('recall.session') },
      ]}
      adBanner={<AdSlot slot="content-bottom" />}
    />
  );
}
