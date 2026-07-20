/**
 * Repertoire (型) — edit page (owner only). The title, the side, the opening
 * links, and the whole move tree — the lines recomposed into one
 * PGN-with-variations and edited on the same board the import form uses (with
 * per-move notes and markup). Saving diffs the tree against the stored lines
 * so unchanged lines keep their identity. Phase stays fixed — it's not
 * authorable anywhere yet beyond `opening` (see `AUTHORABLE_PHASES` on the
 * import form) — but side is plain metadata and editable like the title.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';
import { isEmptyBoardAnnotations } from '@/lib/board-annotations/types';
import { getAnnotationsForRepertoire } from '@/lib/repertoires/annotation-queries';
import { mergeLinePgns } from '@/lib/repertoires/board-builder-tree';
import { getLinkedOpeningIds, getOpeningOptions } from '@/lib/repertoires/opening-queries';
import { getRepertoireForViewer } from '@/lib/repertoires/queries';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { EditRepertoireForm } from '../_components/EditRepertoireForm';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires',
    titleKey: 'edit.title',
    noIndex: true,
    omitDescription: true,
  });
}

export default async function EditRepertoirePage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const currentUser = await getOptionalUser();

  const data = await getRepertoireForViewer(id, currentUser?.id ?? null);
  // Editing is owner-only — don't even reveal the page to others.
  if (!data || !data.isOwner) notFound();
  const { repertoire, lines } = data;

  // The whole tree as one editable PGN (defensive null: a stored line that no
  // longer parses hides the moves editor rather than breaking the page), plus
  // the existing notes / markup for the board editor.
  const initialPgn = mergeLinePgns(lines.map((line) => line.pgn));
  const annotationViews = await getAnnotationsForRepertoire(id);
  const initialAnnotations = Object.fromEntries(
    [...annotationViews].filter(([, v]) => v.text).map(([key, v]) => [key, v.text])
  );
  const initialShapes = Object.fromEntries(
    [...annotationViews]
      .filter(([, v]) => !isEmptyBoardAnnotations(v.shapes))
      .map(([key, v]) => [key, v.shapes])
  );

  // Opening links only exist for an opening-phase repertoire; skip both queries
  // (the whole master + the link rows) for the other phases.
  const canLinkOpenings = repertoire.phase === 'opening';
  const openings = canLinkOpenings ? await getOpeningOptions(locale) : [];
  const initialOpeningIds = canLinkOpenings ? await getLinkedOpeningIds(id) : [];

  return (
    <PageLayout
      title={t('edit.title')}
      locale={locale}
      breadcrumb={[
        { label: t('title'), href: '/repertoires' },
        { label: repertoire.name, href: `/repertoires/${id}` },
        { label: t('edit.breadcrumb') },
      ]}
    >
      <SectionTitle>{t('edit.title')}</SectionTitle>

      <EditRepertoireForm
        locale={locale}
        repertoireId={id}
        initialName={repertoire.name}
        openings={openings}
        initialOpeningIds={initialOpeningIds}
        canLinkOpenings={canLinkOpenings}
        side={repertoire.side}
        initialPgn={initialPgn}
        initialAnnotations={initialAnnotations}
        initialShapes={initialShapes}
      />
    </PageLayout>
  );
}
