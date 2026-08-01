/**
 * Repertoire Line — add page (owner only). The same Board / PGN editor as the
 * line edit page, starting from the moves handed in via `?pgn=` — the kata
 * check's "add this line to your kata" CTA lands here with the uncovered line
 * preloaded, ready to review, extend and name before saving.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';
import { isEmptyBoardAnnotations } from '@/lib/board-annotations/types';
import { getAnnotationsForRepertoire } from '@/lib/repertoires/annotation-queries';
import { getRepertoireForViewer, listChaptersForRepertoire } from '@/lib/repertoires/queries';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { NewLineForm } from './_components/NewLineForm';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires',
    titleKey: 'line.new.title',
    noIndex: true,
    omitDescription: true,
  });
}

export default async function NewRepertoireLinePage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const currentUser = await getOptionalUser();

  const data = await getRepertoireForViewer(id, currentUser?.id ?? null);
  // Adding lines is owner-only — don't even reveal the page to others.
  if (!data || !data.isOwner) notFound();
  const { repertoire } = data;

  // The handed-in moves (bare movetext). A non-standard-root repertoire's
  // moves only replay from its own root, so prepend the FEN header the board
  // parser (and the addLine validator) key on when it isn't already there.
  const sp = await searchParams;
  const rawPgn = typeof sp.pgn === 'string' ? sp.pgn.trim() : '';
  const initialPgn =
    rawPgn && repertoire.startingFen && !/\[FEN\b/i.test(rawPgn)
      ? `[FEN "${repertoire.startingFen}"]\n[SetUp "1"]\n\n${rawPgn}`
      : rawPgn;

  // Existing notes / markup: positions the new line shares with existing
  // lines (the matched prefix) show what's already written there.
  const annotationViews = await getAnnotationsForRepertoire(id);
  const initialAnnotations = Object.fromEntries(
    [...annotationViews].filter(([, v]) => v.text).map(([key, v]) => [key, v.text])
  );
  const initialShapes = Object.fromEntries(
    [...annotationViews]
      .filter(([, v]) => !isEmptyBoardAnnotations(v.shapes))
      .map(([key, v]) => [key, v.shapes])
  );

  // The sections the line can be filed into. Empty for a course with no
  // chapters, which hides the picker rather than offering only "unfiled".
  const chapters = await listChaptersForRepertoire(id);

  return (
    <PageLayout
      title={t('line.new.title')}
      locale={locale}
      breadcrumb={[
        { label: t('title'), href: '/repertoires' },
        { label: repertoire.name, href: `/repertoires/${id}` },
        { label: t('line.new.title') },
      ]}
    >
      <SectionTitle>{t('line.new.title')}</SectionTitle>

      <NewLineForm
        repertoireId={id}
        side={repertoire.side}
        chapters={chapters}
        initialPgn={initialPgn}
        initialAnnotations={initialAnnotations}
        initialShapes={initialShapes}
      />
    </PageLayout>
  );
}
