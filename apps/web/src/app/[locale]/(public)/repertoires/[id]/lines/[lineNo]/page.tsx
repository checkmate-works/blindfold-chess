/**
 * Repertoire Line (ライン) — detail page. One linear line of a repertoire,
 * rendered with the in-game board layout. Each move carries the owner's
 * "why this move" annotation (Chessable-style), editable inline by the owner;
 * non-owners read it. Position/format/annotation lookups are precomputed
 * server-side so the client viewer stays chess.js-free.
 *
 * Comments per move (topicType 'repertoire_move') are layered on top in a
 * follow-up; this page is the board + annotation surface.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { formatMovesToPgn } from '@blindfold-chess/features/chess-core';
import { FiEdit2 } from 'react-icons/fi';

import { getOptionalUser } from '@/lib/auth';
import { getAnnotationsForRepertoire } from '@/lib/repertoires/annotation-queries';
import { lineFallbackTitle } from '@/lib/repertoires/line-display-name';
import { buildPositionTopicKey } from '@/lib/repertoires/position-topic-key';
import { getRepertoireLineForViewer } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';

import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { OwnerActionLink } from '@/app/[locale]/_components/OwnerActionChip';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LineDetailBoard } from './_components/LineDetailBoard';
import { MoveCommentsSection } from './_components/MoveCommentsSection';
import { buildLineMoves } from './_lib/line-moves';

type Props = {
  params: Promise<{ locale: Locale; id: string; lineNo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires',
    titleKey: 'line.title',
    omitDescription: true,
  });
}

export default async function RepertoireLineDetailPage({ params, searchParams }: Props) {
  const { locale, id, lineNo: lineNoParam } = await params;
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const currentUser = await getOptionalUser();

  const lineNo = Number(lineNoParam);
  if (!Number.isInteger(lineNo) || lineNo < 1) notFound();

  const data = await getRepertoireLineForViewer(id, lineNo, currentUser?.id ?? null);
  if (!data) notFound();
  const { repertoire, line, isOwner } = data;

  // Replay + format the line server-side (no chess.js in the client bundle).
  const { sans, positions, startsAsBlack, startMoveNumber } = replayRepertoireLine(line);
  const formatted = formatMovesToPgn(sans, startsAsBlack, startMoveNumber);

  const annotations = await getAnnotationsForRepertoire(id);
  const moves = buildLineMoves({ sans, positions, startsAsBlack, startMoveNumber, annotations });

  const moveParam = Number((await searchParams).move);
  const initialPly =
    Number.isInteger(moveParam) && moveParam >= 1 && moveParam <= sans.length ? moveParam : 1;

  const lineName =
    line.name ?? lineFallbackTitle(formatted, t('detail.lineFallback', { n: lineNo }));

  // What a move reference ("1... e4") inside a note or a comment resolves
  // against — this line's own numbering, not the repertoire's.
  const moveNotation: MoveNotationLine = {
    moves: sans,
    startingFen: line.startingFen,
    playerColor: repertoire.side,
  };

  return (
    <PageLayout
      title={lineName}
      locale={locale}
      breadcrumb={[
        { label: t('title'), href: '/repertoires' },
        { label: repertoire.name, href: `/repertoires/${id}` },
        // The line's own name (falling back to "Line N" when unnamed) — the
        // same label the heading shows, so renaming a line is reflected here.
        { label: lineName },
      ]}
    >
      <SectionTitle>{lineName}</SectionTitle>

      {sans.length === 0 ? (
        <p className="text-muted-foreground">{t('line.empty')}</p>
      ) : (
        <LineDetailBoard
          side={repertoire.side}
          formatted={formatted}
          positions={positions}
          moves={moves}
          isOwner={isOwner}
          repertoireId={id}
          lineNo={lineNo}
          locale={locale}
          initialPly={initialPly}
          moveNotation={moveNotation}
        />
      )}

      {isOwner && (
        <div className="flex items-center justify-end gap-4">
          <OwnerActionLink href={`/repertoires/${id}/lines/${lineNo}/edit`} size="xs">
            <FiEdit2 aria-hidden />
            {t('line.edit.editAction')}
          </OwnerActionLink>
        </div>
      )}

      {sans.length > 0 && (
        <MoveCommentsSection
          locale={locale}
          repertoireId={id}
          lineNo={lineNo}
          ply={initialPly}
          topicKey={buildPositionTopicKey(id, positions[initialPly].fen)}
          moveNotationLine={moveNotation}
          currentUserId={currentUser?.id}
        />
      )}

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
