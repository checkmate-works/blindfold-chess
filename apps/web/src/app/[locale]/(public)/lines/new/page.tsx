/**
 * Repertoires (型) — import page. Paste a PGN-with-variations to create a new
 * repertoire; it is decomposed into one line per variation.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getAuthenticatedUser } from '@/lib/auth';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { RepertoireImportForm } from '../_components/RepertoireImportForm';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Lines',
    path: 'lines/new',
    titleKey: 'new.title',
    noIndex: true,
    omitDescription: true,
  });
}

export default async function NewLinePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Lines' });
  await getAuthenticatedUser();

  return (
    <PageLayout
      title={t('new.title')}
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/lines' }, { label: t('new.title') }]}
    >
      <SectionTitle>{t('new.sectionTitle')}</SectionTitle>
      <RepertoireImportForm locale={locale} />
    </PageLayout>
  );
}
