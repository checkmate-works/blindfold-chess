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

import { formatMovesToPgn, generatePgn } from '@blindfold-chess/features/chess-core';

import { getOptionalUser } from '@/lib/auth';
import { getAnnotationsForRepertoire } from '@/lib/repertoires/annotation-queries';
import { lineFallbackTitle } from '@/lib/repertoires/line-display-name';
import { buildPositionTopicKey } from '@/lib/repertoires/position-topic-key';
import { getRepertoireLineForViewer } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';
import { resolveAuthorName } from '@/lib/users/display-name';

import { PositionAuthorHeader } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorHeader';
import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LineDetailBoard } from './_components/LineDetailBoard';
import { LineNavList } from './_components/LineNavList';
import { MoveCommentsSection } from './_components/MoveCommentsSection';
import { RepertoireLineActionsMenu } from './_components/RepertoireLineActionsMenu';
import { buildContinuationLinks } from './_lib/line-continuations';
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
  const tCommon = await getTranslations({ locale, namespace: 'Common' });
  const currentUser = await getOptionalUser();

  const lineNo = Number(lineNoParam);
  if (!Number.isInteger(lineNo) || lineNo < 1) notFound();

  const data = await getRepertoireLineForViewer(id, lineNo, currentUser?.id ?? null);
  if (!data) notFound();
  const { repertoire, line, lines, profile, isOwner } = data;

  // Replay every sibling line once — the sidebar's fallback titles and the
  // transposition detection below both need it, and replay isn't free.
  const replayedLines = lines.map((l) => ({ line: l, replayed: replayRepertoireLine(l) }));
  const { sans, positions, startsAsBlack, startMoveNumber } = replayedLines.find(
    (rl) => rl.line.id === line.id
  )!.replayed;
  const formatted = formatMovesToPgn(sans, startsAsBlack, startMoveNumber);

  const annotations = await getAnnotationsForRepertoire(id);
  const moves = buildLineMoves({ sans, positions, startsAsBlack, startMoveNumber, annotations });

  // Per-ply prefix PGNs for the owner's "branch from this position" affordance:
  // `branchPgns[p - 1]` is this line's moves through ply p, which seeds a new
  // line (`lines/new?pgn=`) that shares the prefix and diverges after it —
  // in-place variation authoring without retyping the shared moves. Only the
  // owner can add lines, so this is computed for them alone.
  const branchPgns = isOwner
    ? sans.map((_, idx) => generatePgn(sans.slice(0, idx + 1), line.startingFen ?? undefined))
    : [];

  const moveParam = Number((await searchParams).move);
  const initialPly =
    Number.isInteger(moveParam) && moveParam >= 1 && moveParam <= sans.length ? moveParam : 1;

  const lineName =
    line.name ?? lineFallbackTitle(formatted, t('detail.lineFallback', { n: lineNo }));

  // Sibling lines for the switching list — the same labels (and the same
  // moves-derived fallback) the repertoire page's sidebar shows, so a line
  // reads identically on both pages.
  const navItems = replayedLines.map(({ line: l, replayed }) => {
    const label =
      l.name ??
      lineFallbackTitle(
        formatMovesToPgn(replayed.sans, replayed.startsAsBlack, replayed.startMoveNumber),
        t('detail.lineFallback', { n: l.lineNo })
      );
    return { id: l.id, lineNo: l.lineNo, label };
  });
  const navProps = {
    navItems,
    navHeading: t('detail.linesHeading'),
    navAddLineLabel: isOwner ? t('line.new.title') : undefined,
    navManageLabel: isOwner ? t('lines.manageAction') : undefined,
  };

  // Transposition continuations: where this line's final position keeps
  // going in a sibling line, reached by a different move order. Detection
  // reuses the replay above rather than re-parsing PGN; label/lineNo for the
  // target come from `navItems` (id-keyed) so they read identically to the
  // sidebar entry a reader would otherwise click.
  const navLabelById = new Map(
    navItems.map((item) => [item.id, { lineNo: item.lineNo, label: item.label }])
  );
  const continuations = buildContinuationLinks(
    { id: line.id, positions },
    replayedLines
      .filter((rl) => rl.line.id !== line.id)
      .map((rl) => ({ id: rl.line.id, positions: rl.replayed.positions })),
    (lineId) => navLabelById.get(lineId)!
  );

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
        <div className="space-y-4">
          <p className="text-muted-foreground">{t('line.empty')}</p>
          <LineNavList
            items={navItems}
            currentLineNo={lineNo}
            repertoireId={id}
            locale={locale}
            heading={t('detail.linesHeading')}
            addLineLabel={isOwner ? t('line.new.title') : undefined}
            manageLabel={isOwner ? t('lines.manageAction') : undefined}
          />
        </div>
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
          branchPgns={branchPgns}
          continuations={continuations}
          {...navProps}
        />
      )}

      {/* Same author attribution the repertoire (型) detail page shows —
          "Created by" + the owner's avatar/name — with whole-line editing
          moved into the "⋯" overflow menu (owner only), matching the puzzle /
          shared-game detail pages. Attributed to the line's own timestamps. */}
      <PositionAuthorHeader
        profile={profile}
        displayName={resolveAuthorName(profile, { fallback: tCommon('deletedUser') })}
        createdByLabel={t('detail.createdBy')}
        locale={locale}
        createdAt={line.createdAt}
        edited={line.updatedAt.getTime() - line.createdAt.getTime() > 1000}
        editedLabel={t('detail.edited')}
        menu={
          isOwner ? (
            <RepertoireLineActionsMenu repertoireId={id} lineNo={lineNo} locale={locale} />
          ) : undefined
        }
      />

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
