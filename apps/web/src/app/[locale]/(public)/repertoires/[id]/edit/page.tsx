/**
 * Repertoire (型) — edit page (owner only). METADATA only: the title, the
 * description, the side, and the opening links. The move tree is edited per
 * line on each line's own page (edit / delete / branch), not as one recomposed
 * PGN here — a whole-kata diff-and-save was where line identity got lost and
 * notes were silently orphaned. Phase stays fixed — it's not authorable
 * anywhere yet beyond `opening` (see `AUTHORABLE_PHASES` on the import form) —
 * but side is plain metadata and editable like the title.
 *
 * The line ORDER is likewise not edited here, only linked to: this form saves
 * on submit, while reordering saves on drop, and one screen holding both save
 * models is a reliable way to lose someone's changes. See `../lines/page.tsx`.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { HiBars3 } from 'react-icons/hi2';

import { getOptionalUser } from '@/lib/auth';
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
  const { repertoire } = data;

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
        repertoireId={id}
        initialName={repertoire.name}
        initialDescription={repertoire.description ?? ''}
        openings={openings}
        initialOpeningIds={initialOpeningIds}
        canLinkOpenings={canLinkOpenings}
        side={repertoire.side}
      />

      {data.lines.length > 1 && (
        <Link
          href={`/${locale}/repertoires/${id}/lines`}
          className="inline-flex items-center gap-1.5 text-sm text-link-primary transition-colors hover:underline"
        >
          <HiBars3 aria-hidden className="size-4" />
          {t('lines.title')}
        </Link>
      )}
    </PageLayout>
  );
}
