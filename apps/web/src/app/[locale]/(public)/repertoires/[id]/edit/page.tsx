/**
 * Repertoire (型) — edit page (owner only). Metadata only: the title and, for an
 * opening-phase repertoire, its opening links. The lines and the position-keyed
 * annotations hanging off them derive from the imported PGN / side / phase, so
 * re-shaping those is a re-import, not an edit.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

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
        locale={locale}
        repertoireId={id}
        initialName={repertoire.name}
        openings={openings}
        initialOpeningIds={initialOpeningIds}
        canLinkOpenings={canLinkOpenings}
      />
    </PageLayout>
  );
}
