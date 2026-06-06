/**
 * Repertoire (型) — detail page. Board preview of the root position plus the
 * list of lines (variations), with an owner delete affordance. Per-line social
 * (likes/comments on individual lines) and a Chessable-style line viewer are
 * planned follow-ups; this lists the lines a repertoire decomposes into.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import { getStartingFen, parsePgn } from '@blindfold-chess/features/chess-core';

import { getAuthenticatedUser } from '@/lib/auth';
import { getRepertoireForUser } from '@/lib/repertoires/queries';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DeleteRepertoireButton } from '../_components/DeleteRepertoireButton';

type Props = { params: Promise<{ locale: Locale; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Lines',
    path: 'lines',
    titleKey: 'detail.title',
    noIndex: true,
    omitDescription: true,
  });
}

/** Best-effort SAN list for a single line's PGN (a path, so no variations). */
function lineMoves(pgn: string): string[] {
  try {
    return parsePgn(pgn);
  } catch {
    return [];
  }
}

export default async function RepertoireDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'Lines' });
  const user = await getAuthenticatedUser();

  const data = await getRepertoireForUser(id, user.id);
  if (!data) notFound();
  const { repertoire, lines } = data;
  const rootFen = repertoire.startingFen ?? getStartingFen();

  return (
    <PageLayout
      title={repertoire.name}
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/lines' }, { label: repertoire.name }]}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5">
          {t(`form.side_${repertoire.side}`)}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5">
          {t(`form.phase_${repertoire.phase}`)}
        </span>
        <span>{t('detail.lineCount', { count: lines.length })}</span>
      </div>

      {repertoire.description && (
        <p className="mb-6 text-sm text-muted-foreground">{repertoire.description}</p>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="w-full max-w-[320px]">
          <ChessBoard
            fen={rootFen}
            flipped={repertoire.side === 'black'}
            playerSide={repertoire.side}
            showCoordinates
            showOwnPieces
            showOpponentPieces
            boardTheme="lichess"
            rounded
          />
        </div>

        <div className="min-w-0">
          <SectionTitle>{t('detail.linesHeading')}</SectionTitle>
          <ol className="mt-2 space-y-2">
            {lines.map((line, index) => (
              <li key={line.id} className="rounded-lg border border-border bg-card p-3">
                <div className="font-medium text-foreground">
                  {line.name ?? t('detail.lineFallback', { n: index + 1 })}
                </div>
                <div className="mt-1 break-words font-mono text-xs text-muted-foreground">
                  {lineMoves(line.pgn).join(' ')}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <DeleteRepertoireButton id={repertoire.id} locale={locale} afterDelete="list" />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
