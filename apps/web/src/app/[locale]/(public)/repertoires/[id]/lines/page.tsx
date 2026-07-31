/**
 * Repertoire (型) — line management page (owner only).
 *
 * @description Arranging the lines of a course, which the read surfaces
 * deliberately can't do: the detail page's sidebar and a line page's switcher
 * are one-line, truncated rows built for picking a line, not for judging how a
 * dozen of them should be sequenced. This page trades the board for width —
 * each row shows its title AND its opening moves — and is the only place the
 * order is writable.
 *
 * @flow owner opens it from the detail page's line panel (or the edit page) →
 * drags / ▲▼s the rows → Save commits the arrangement and returns to the
 * course; Cancel discards it. Same submit-then-save contract as the metadata
 * form, so an arrangement can be tried out and backed away from.
 *
 * Still its own page rather than a section of `/[id]/edit`: reordering wants
 * the full width for a title-plus-moves row per line, and bundling it into that
 * form would make one Save button responsible for two unrelated edits.
 *
 * How to move a row, and why the numbers don't move with it, are a help tour
 * rather than a line of body copy — both facts are about something inside a
 * row, and the second is only convincing while looking at the number it is
 * about.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { formatMovesToPgn } from '@blindfold-chess/features/chess-core';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';

import { getOptionalUser } from '@/lib/auth';
import { lineFallbackTitle } from '@/lib/repertoires/line-display-name';
import { getRepertoireForViewer, listChaptersForRepertoire } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';

import { HelpTourButton, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { ArrangeRow, LineOrderRow } from './_components/LineOrderList';
import { LineOrderList } from './_components/LineOrderList';

/** Move pairs shown on a row's second line before truncating. */
const PREVIEW_PAIRS = 6;

/** `data-tour-id`s the help tour points at (see `helpSteps` below). */
const HANDLE_HELP_TARGET = 'repertoire-lines-handle-help';
const LINE_NO_HELP_TARGET = 'repertoire-lines-number-help';
const CHAPTER_HELP_TARGET = 'repertoire-lines-chapter-help';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires',
    titleKey: 'lines.title',
    noIndex: true,
    omitDescription: true,
  });
}

/** "1. Nf3 d5 2. g3 c5 …" — enough moves to tell two similar lines apart. */
function movesPreview(formatted: FormattedPgnMove[]): string {
  const text = formatted
    .slice(0, PREVIEW_PAIRS)
    .map(
      (pair) => `${pair.moveNumber}. ${[pair.whiteMove, pair.blackMove].filter(Boolean).join(' ')}`
    )
    .join(' ');
  return formatted.length > PREVIEW_PAIRS ? `${text} …` : text;
}

export default async function RepertoireLinesPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const currentUser = await getOptionalUser();

  const data = await getRepertoireForViewer(id, currentUser?.id ?? null);
  // Reordering is owner-only — don't even reveal the page to others.
  if (!data || !data.isOwner) notFound();
  const { repertoire, lines } = data;
  const chapters = await listChaptersForRepertoire(id);

  const lineRows = new Map<string | null, LineOrderRow[]>();
  for (const line of lines) {
    const { sans, startsAsBlack, startMoveNumber } = replayRepertoireLine(line);
    const formatted = formatMovesToPgn(sans, startsAsBlack, startMoveNumber);
    const bucket = lineRows.get(line.chapterId) ?? [];
    bucket.push({
      kind: 'line',
      lineNo: line.lineNo,
      label:
        line.name ?? lineFallbackTitle(formatted, t('detail.lineFallback', { n: line.lineNo })),
      moves: movesPreview(formatted),
    });
    lineRows.set(line.chapterId, bucket);
  }

  // Flatten to the single column the arrange list edits: each chapter followed
  // by its lines, then the unfiled divider and whatever is left. `lines` is
  // already in that order (see `linesInDisplayOrder`); this only inserts the
  // headings. The divider is present even with nothing under it — it is the
  // drop target for taking a line back OUT of a chapter.
  const rows: ArrangeRow[] = [
    ...chapters.flatMap((chapter): ArrangeRow[] => [
      { kind: 'chapter', key: chapter.id, name: chapter.name },
      ...(lineRows.get(chapter.id) ?? []),
    ]),
    { kind: 'unfiled' },
    ...(lineRows.get(null) ?? []),
  ];

  // How to move a row, then why the numbers don't follow it. Both point INTO a
  // row (the grip, then its "#N"), which is why they are a tour and not a line
  // of help text: the second point in particular is only convincing when the
  // reader is looking at the number it is about.
  const helpSteps: HelpStep[] = [
    {
      targetId: HANDLE_HELP_TARGET,
      title: t('help.arrange.title'),
      description: t('help.arrange.description'),
      side: 'bottom',
      align: 'start',
    },
    {
      targetId: LINE_NO_HELP_TARGET,
      title: t('help.lineNumbers.title'),
      description: t('help.lineNumbers.description'),
      side: 'bottom',
      align: 'end',
    },
    // Skipped automatically when the course has no chapters yet — which is the
    // right time NOT to explain them.
    {
      targetId: CHAPTER_HELP_TARGET,
      title: t('help.chapters.title'),
      description: t('help.chapters.description'),
      side: 'bottom',
      align: 'start',
    },
  ];

  return (
    <PageLayout
      // The course name, not "Arrange lines" — the SectionTitle right below
      // already says what the page is, and the owner needs to see WHICH kata.
      title={repertoire.name}
      // Every step targets a line row, so a lineless course has nothing to tour.
      titleAction={
        lines.length > 0 ? <HelpTourButton steps={helpSteps} label={t('help.label')} /> : undefined
      }
      locale={locale}
      breadcrumb={[
        { label: t('title'), href: '/repertoires' },
        { label: repertoire.name, href: `/repertoires/${id}` },
        { label: t('lines.breadcrumb') },
      ]}
    >
      <SectionTitle>{t('lines.title')}</SectionTitle>

      {/* `rows` always contains the unfiled divider, so emptiness is judged on
          the content. Chapters alone (every line deleted since filing) still
          render the list — it is the only place they can be removed. */}
      {lines.length === 0 && chapters.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t('detail.noLines')}</p>
      ) : (
        /* The list owns the Save / Cancel pair, since only it knows whether the
           order is dirty. No "add a line" alongside them on purpose: this page
           arranges what the course already has, and authoring a new line is a
           different job with its own entry points (the line panel, a line's
           branch affordance). */
        <LineOrderList
          repertoireId={id}
          rows={rows}
          detailHref={`/repertoires/${id}`}
          tourIds={{
            handle: HANDLE_HELP_TARGET,
            lineNo: LINE_NO_HELP_TARGET,
            chapter: CHAPTER_HELP_TARGET,
          }}
          labels={{
            dragHandle: t('lines.dragHandle'),
            moveUp: t('lines.moveUp'),
            moveDown: t('lines.moveDown'),
            unfiled: t('lines.unfiled'),
            addChapter: t('lines.addChapter'),
            chapterName: t('lines.chapterName'),
            newChapterName: t('lines.newChapterName'),
            removeChapter: t('lines.removeChapter'),
            save: t('lines.save'),
            saving: t('lines.saving'),
            cancel: t('lines.cancel'),
            error: t('lines.error'),
          }}
        />
      )}
    </PageLayout>
  );
}
