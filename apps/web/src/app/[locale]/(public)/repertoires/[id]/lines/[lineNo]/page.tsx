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

import { Link } from '@/i18n/routing';
import { FiEdit2 } from 'react-icons/fi';

import { getOptionalUser } from '@/lib/auth';
import { getAnnotationsForRepertoire } from '@/lib/repertoires/annotation-queries';
import { buildPositionTopicKey } from '@/lib/repertoires/position-topic-key';
import { getRepertoireLineForViewer } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';

import { formatMovesToPgn } from '@/app/[locale]/(public)/practice/(free-play)/recall/_lib/format-moves-to-pgn';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
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

  const lineName = line.name ?? t('detail.lineFallback', { n: lineNo });

  return (
    <PageLayout
      title={lineName}
      locale={locale}
      breadcrumb={[
        { label: t('title'), href: '/repertoires' },
        { label: repertoire.name, href: `/repertoires/${id}` },
        { label: t('line.breadcrumb', { n: lineNo }) },
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
        />
      )}

      {isOwner && (
        <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
          <Link
            href={`/repertoires/${id}/lines/${lineNo}/edit`}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <FiEdit2 className="h-3 w-3" aria-hidden />
            {t('line.edit.editAction')}
          </Link>
        </div>
      )}

      {sans.length > 0 && (
        <MoveCommentsSection
          locale={locale}
          repertoireId={id}
          lineNo={lineNo}
          ply={initialPly}
          topicKey={buildPositionTopicKey(id, positions[initialPly].fen)}
          currentUserId={currentUser?.id}
        />
      )}

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
