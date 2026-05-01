import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { readPeekPreferenceFromCookies } from '@/lib/games/peek-cookie.server';

import { PiecesInfo } from '@/app/[locale]/(public)/practice/_components/PiecesInfo';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PuzzleSessionClient } from '../../../_components/session/PuzzleSessionClient';
import { loadPuzzleWithSolutions } from '../../../_lib/load-puzzle';

/**
 * Reading the `bfc_peek_pref` cookie via `readPeekPreferenceFromCookies`
 * makes this page dynamic. Mirrors the rationale on `/games/play/page.tsx` —
 * the cookie is a per-user UI hint so the page must opt out of static
 * prerendering. Other puzzle pages remain ISR-eligible.
 */
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });

  const row = await loadPuzzleWithSolutions(id);
  if (!row) {
    return { title: t('session.title') };
  }

  const title = `${row.position.title} - ${t('session.title')}`;
  return {
    ...generateCanonicalMetadata({
      locale,
      path: `practice/puzzle/${id}/session`,
      title,
      description: t('description'),
    }),
    title: resolveTitle(title, locale),
  };
}

export default async function PuzzleSessionPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const row = await loadPuzzleWithSolutions(id);
  if (!row) {
    notFound();
  }

  const { position, solutions } = row;

  const peekHint = await readPeekPreferenceFromCookies();

  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/puzzle' },
        { label: position.title, href: `/practice/puzzle/${position.id}` },
        { label: t('session.title') },
      ]}
      locale={locale}
    />
  );

  const piecesInfo = <PiecesInfo fen={position.fen} />;

  return (
    <PuzzleSessionClient
      solutions={solutions.map((s) => s.solutionMoves)}
      positionId={position.id}
      fen={position.fen}
      positionTitle={position.title}
      piecesInfo={piecesInfo}
      breadcrumb={breadcrumb}
      initialPeekHint={peekHint}
    />
  );
}
