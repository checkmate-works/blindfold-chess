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

import { parsePgn, replayMoves, toPositionKey } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { getOptionalUser } from '@/lib/auth';
import { getAnnotationsForRepertoire } from '@/lib/repertoires/annotation-queries';
import { getRepertoireForViewer } from '@/lib/repertoires/queries';

import { formatMovesToPgn } from '@/app/[locale]/(public)/games/play/postmortem/_lib/format-moves-to-pgn';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { LineMove } from './_components/LineDetailBoard';
import { LineDetailBoard } from './_components/LineDetailBoard';
import { MoveCommentsSection } from './_components/MoveCommentsSection';

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

/** Full-move number + side label for the i-th half-move (1-based). */
function moveLabel(
  san: string,
  ply: number,
  startsAsBlack: boolean,
  startMoveNumber: number
): string {
  const blackToMove = startsAsBlack ? ply % 2 === 1 : ply % 2 === 0;
  const fullMove = startsAsBlack
    ? startMoveNumber + Math.floor(ply / 2)
    : startMoveNumber + Math.floor((ply - 1) / 2);
  return blackToMove ? `${fullMove}... ${san}` : `${fullMove}. ${san}`;
}

export default async function RepertoireLineDetailPage({ params, searchParams }: Props) {
  const { locale, id, lineNo: lineNoParam } = await params;
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const currentUser = await getOptionalUser();

  const lineNo = Number(lineNoParam);
  if (!Number.isInteger(lineNo) || lineNo < 1) notFound();

  const data = await getRepertoireForViewer(id, currentUser?.id ?? null);
  if (!data) notFound();
  const { repertoire, lines, isOwner } = data;

  const line = lines.find((l) => l.seq === lineNo - 1);
  if (!line) notFound();

  // Replay + format the line server-side (no chess.js in the client bundle).
  let sans: AlgebraicNotation[] = [];
  try {
    sans = parsePgn(line.pgn) as AlgebraicNotation[];
  } catch {
    sans = [];
  }
  const positions = replayMoves(sans, line.startingFen ?? undefined).map((p) => ({
    fen: p.fen,
    lastMove: p.lastMove ?? null,
  }));

  const startField = line.startingFen?.split(' ');
  const startsAsBlack = startField?.[1] === 'b';
  const startMoveNumber = startField ? Number(startField[5]) || 1 : 1;
  const formatted = formatMovesToPgn(sans, startsAsBlack, startMoveNumber);

  const annotations = await getAnnotationsForRepertoire(id);

  // One LineMove per ply (positions[i] is the position after move i).
  const moves: LineMove[] = sans.map((san, idx) => {
    const ply = idx + 1;
    const positionKey = toPositionKey(positions[ply].fen);
    return {
      positionKey,
      label: moveLabel(san, ply, startsAsBlack, startMoveNumber),
      annotation: annotations.get(positionKey)?.text ?? null,
    };
  });

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
        <>
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

          <MoveCommentsSection
            locale={locale}
            repertoireId={id}
            lineNo={lineNo}
            ply={initialPly}
            currentUserId={currentUser?.id}
          />
        </>
      )}
    </PageLayout>
  );
}
