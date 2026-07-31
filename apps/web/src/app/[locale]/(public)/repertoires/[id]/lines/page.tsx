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
 * drags / ▲▼s the rows → every drop persists immediately → back to the course.
 *
 * Kept off `/[id]/edit` on purpose: that page is a submit-then-save metadata
 * form, and an order that saves on drop inside it would put two different save
 * models on one screen.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { formatMovesToPgn } from '@blindfold-chess/features/chess-core';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';

import { getOptionalUser } from '@/lib/auth';
import { lineFallbackTitle } from '@/lib/repertoires/line-display-name';
import { getRepertoireForViewer } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { LineOrderRow } from './_components/LineOrderList';
import { LineOrderList } from './_components/LineOrderList';

/** Move pairs shown on a row's second line before truncating. */
const PREVIEW_PAIRS = 6;

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

  // `lines` arrives in `seq` order, which IS the order being edited.
  const rows: LineOrderRow[] = lines.map((line) => {
    const { sans, startsAsBlack, startMoveNumber } = replayRepertoireLine(line);
    const formatted = formatMovesToPgn(sans, startsAsBlack, startMoveNumber);
    return {
      lineNo: line.lineNo,
      label:
        line.name ?? lineFallbackTitle(formatted, t('detail.lineFallback', { n: line.lineNo })),
      moves: movesPreview(formatted),
    };
  });

  return (
    <PageLayout
      // The course name, not "Arrange lines" — the SectionTitle right below
      // already says what the page is, and the owner needs to see WHICH kata.
      title={repertoire.name}
      locale={locale}
      breadcrumb={[
        { label: t('title'), href: '/repertoires' },
        { label: repertoire.name, href: `/repertoires/${id}` },
        { label: t('lines.breadcrumb') },
      ]}
    >
      <SectionTitle>{t('lines.title')}</SectionTitle>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t('detail.noLines')}</p>
      ) : (
        <LineOrderList
          repertoireId={id}
          rows={rows}
          labels={{
            hint: t('lines.hint'),
            dragHandle: t('lines.dragHandle'),
            moveUp: t('lines.moveUp'),
            moveDown: t('lines.moveDown'),
            error: t('lines.error'),
          }}
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href={`/${locale}/repertoires/${id}/lines/new`} className="flex-1">
          <Button asChild variant="outline" fullWidth>
            {t('line.new.title')}
          </Button>
        </Link>
        <Link href={`/${locale}/repertoires/${id}`} className="flex-1">
          <Button asChild variant="primary" fullWidth>
            {t('lines.done')}
          </Button>
        </Link>
      </div>
    </PageLayout>
  );
}
