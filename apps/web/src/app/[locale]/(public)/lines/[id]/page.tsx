/**
 * Lines (型) — detail page. Board preview of the root position plus the raw
 * PGN of the tree, with a delete affordance.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import { getStartingFen } from '@blindfold-chess/features/chess-core';

import { getAuthenticatedUser } from '@/lib/auth';
import { getLineForUser } from '@/lib/lines/queries';
import { summarizeLinePgn } from '@/lib/lines/validation';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DeleteLineButton } from '../_components/DeleteLineButton';

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

export default async function LineDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'Lines' });
  const user = await getAuthenticatedUser();

  const line = await getLineForUser(id, user.id);
  if (!line) notFound();

  const summary = summarizeLinePgn(line.pgn);
  const rootFen = line.startingFen ?? getStartingFen();

  return (
    <PageLayout
      title={line.name}
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/lines' }, { label: line.name }]}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5">{t(`form.side_${line.side}`)}</span>
        <span>{t('summary', { lines: summary.lineCount, moves: summary.moveCount })}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="w-full max-w-[320px]">
          <ChessBoard
            fen={rootFen}
            flipped={line.side === 'black'}
            playerSide={line.side}
            showCoordinates
            showOwnPieces
            showOpponentPieces
            boardTheme="lichess"
            rounded
          />
        </div>

        <div className="min-w-0">
          <SectionTitle>{t('detail.pgnHeading')}</SectionTitle>
          <pre className="mt-2 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-card p-4 font-mono text-sm text-foreground">
            {line.pgn}
          </pre>
          <div className="mt-4">
            <DeleteLineButton id={line.id} locale={locale} afterDelete="list" />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
