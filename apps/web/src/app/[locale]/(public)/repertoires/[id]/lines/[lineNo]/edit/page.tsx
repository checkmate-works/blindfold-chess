/**
 * Repertoire Line — edit page (owner only). A plain title + PGN-moves textbox.
 * Saving replaces the line's moves; position-keyed annotations and per-move
 * comments follow the surviving positions on their own, so there is nothing to
 * migrate here.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { formatMovesToPgn } from '@blindfold-chess/features/chess-core';

import { getOptionalUser } from '@/lib/auth';
import { isEmptyBoardAnnotations } from '@/lib/board-annotations/types';
import { getAnnotationsForRepertoire } from '@/lib/repertoires/annotation-queries';
import { lineFallbackTitle } from '@/lib/repertoires/line-display-name';
import { getRepertoireLineForViewer, listChaptersForRepertoire } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { EditLineForm } from '../_components/EditLineForm';

type Props = {
  params: Promise<{ locale: Locale; id: string; lineNo: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires',
    titleKey: 'line.edit.title',
    noIndex: true,
    omitDescription: true,
  });
}

export default async function EditRepertoireLinePage({ params }: Props) {
  const { locale, id, lineNo: lineNoParam } = await params;
  const [t, currentUser] = await Promise.all([
    getTranslations({ locale, namespace: 'Repertoires' }),
    getOptionalUser(),
  ]);

  const lineNo = Number(lineNoParam);
  if (!Number.isInteger(lineNo) || lineNo < 1) notFound();

  const data = await getRepertoireLineForViewer(id, lineNo, currentUser?.id ?? null);
  // Editing is owner-only — don't even reveal the page to others.
  if (!data || !data.isOwner) notFound();
  const { repertoire, line } = data;

  // Replayed only for the breadcrumb's fallback title when the line is
  // unnamed — the form itself edits the raw PGN, not this formatted view.
  const { sans, startsAsBlack, startMoveNumber } = replayRepertoireLine(line);
  const formatted = formatMovesToPgn(sans, startsAsBlack, startMoveNumber);
  const lineName =
    line.name ?? lineFallbackTitle(formatted, t('detail.lineFallback', { n: lineNo }));

  // Existing "why this move" notes and board markup — prefill the per-move
  // note editor and the board's drawing surface. Repertoire-wide by design:
  // both are keyed by position, so a transposing line shares them. Fetched
  // together with the chapter list below — both are keyed on the repertoire
  // only.
  const [annotationViews, chapters] = await Promise.all([
    getAnnotationsForRepertoire(id),
    listChaptersForRepertoire(id),
  ]);
  const initialAnnotations = Object.fromEntries(
    [...annotationViews].filter(([, v]) => v.text).map(([key, v]) => [key, v.text])
  );
  const initialShapes = Object.fromEntries(
    [...annotationViews]
      .filter(([, v]) => !isEmptyBoardAnnotations(v.shapes))
      .map(([key, v]) => [key, v.shapes])
  );

  // `chapters`: the sections this line can be re-filed into. Empty for a
  // course with no chapters, which hides the picker rather than offering only
  // "unfiled".

  return (
    <PageLayout
      title={t('line.edit.title')}
      locale={locale}
      breadcrumb={[
        { label: t('title'), href: '/repertoires' },
        { label: repertoire.name, href: `/repertoires/${id}` },
        { label: lineName, href: `/repertoires/${id}/lines/${lineNo}` },
        { label: t('line.edit.breadcrumb') },
      ]}
    >
      <SectionTitle>{t('line.edit.title')}</SectionTitle>

      <EditLineForm
        repertoireId={id}
        lineNo={lineNo}
        initialName={line.name ?? ''}
        chapters={chapters}
        initialChapterId={line.chapterId}
        initialPgn={line.pgn}
        side={repertoire.side}
        initialAnnotations={initialAnnotations}
        initialShapes={initialShapes}
      />
    </PageLayout>
  );
}
