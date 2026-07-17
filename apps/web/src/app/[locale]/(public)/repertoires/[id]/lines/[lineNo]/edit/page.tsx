/**
 * Repertoire Line — edit page (owner only). A plain title + PGN-moves textbox.
 * Saving replaces the line's moves; position-keyed annotations and per-move
 * comments follow the surviving positions on their own, so there is nothing to
 * migrate here.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';
import { getRepertoireLineForViewer } from '@/lib/repertoires/queries';

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
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const currentUser = await getOptionalUser();

  const lineNo = Number(lineNoParam);
  if (!Number.isInteger(lineNo) || lineNo < 1) notFound();

  const data = await getRepertoireLineForViewer(id, lineNo, currentUser?.id ?? null);
  // Editing is owner-only — don't even reveal the page to others.
  if (!data || !data.isOwner) notFound();
  const { repertoire, line } = data;

  const lineName = line.name ?? t('detail.lineFallback', { n: lineNo });

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
        locale={locale}
        repertoireId={id}
        lineNo={lineNo}
        initialName={line.name ?? ''}
        initialPgn={line.pgn}
        side={repertoire.side}
      />
    </PageLayout>
  );
}
